/**
 * Bunti Halfblock Pixel Canvas
 * 2x vertical resolution on the character grid: every terminal cell renders
 * a vertical pair of "pixels" using half-block glyphs.
 *
 * Semantics (per cell = pixel rows 2*cy and 2*cy+1 of the canvas):
 * - both pixels set   -> '▀' with fg = top pixel, bg = bottom pixel
 * - only top set      -> '▀' with fg = top; bg untouched (bottom half
 *                        transparent: the cell's existing background shows)
 * - only bottom set   -> '▄' with fg = bottom; bg untouched (top half
 *                        transparent)
 * - neither set       -> the cell is not painted at all (fully transparent)
 *
 * Odd canvas heights leave the final row's missing bottom half unset
 * (transparent). blitTo clips at the screen bounds; set() ignores
 * out-of-range coordinates.
 */

import { setCell } from './layout';
import type { RGB, ScreenState } from './state';

/** Upper half block: fg paints the top half, bg the bottom half. */
const UPPER_HALF = '▀';
/** Lower half block: fg paints the bottom half; the top half stays bg. */
const LOWER_HALF = '▄';

/**
 * A 2x-vertical-resolution pixel buffer that composites onto a screen as
 * half-block cells. Created by createPixelCanvas().
 */
export interface PixelCanvas {
  /** Canvas width in pixels (equal to the blitted width in cells). */
  readonly width: number;
  /** Canvas height in pixels (two pixels per terminal row). */
  readonly height: number;
  /** Sets one pixel to an RGB color. Out-of-range coordinates are ignored. */
  set(x: number, y: number, rgb: RGB): void;
  /** Resets every pixel to unset (transparent). */
  clear(): void;
  /**
   * Paints the canvas into `state`'s back buffer with its top-left pixel at
   * cell (cellX, cellY). Cells whose pixel pair is entirely unset are
   * skipped, so sprites composite over whatever is already painted; cells
   * with one set pixel keep the underlying background for the unset half.
   * Clipping at the screen edges is automatic.
   */
  blitTo(state: ScreenState, cellX: number, cellY: number): void;
}

/**
 * Creates a width×height pixel canvas rendered at 2x vertical resolution
 * via half-block glyphs ('▀'/'▄'): each terminal cell shows two vertically
 * stacked pixels (fg = top, bg = bottom). Unset pixels are transparent —
 * fully unset pairs leave the cell untouched, half-set pairs keep the
 * cell's existing background for the unset half. A canvas of height H
 * occupies ceil(H / 2) terminal rows.
 * @example const px = createPixelCanvas(16, 16); px.set(8, 8, { r: 255, g: 80, b: 0 }); px.blitTo(ctx.state, 2, 1);
 */
export function createPixelCanvas(width: number, height: number): PixelCanvas {
  const pixels: (RGB | undefined)[] = new Array(width * height).fill(undefined);

  return {
    width,
    height,

    set(x: number, y: number, rgb: RGB) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      pixels[y * width + x] = rgb;
    },

    clear() {
      pixels.fill(undefined);
    },

    blitTo(state: ScreenState, cellX: number, cellY: number) {
      const cellRows = Math.ceil(height / 2);
      for (let cy = 0; cy < cellRows; cy++) {
        const topRow = cy * 2;
        const bottomRow = topRow + 1;
        for (let x = 0; x < width; x++) {
          const top = pixels[topRow * width + x];
          const bottom =
            bottomRow < height ? pixels[bottomRow * width + x] : undefined;

          // raw: half blocks are painted verbatim (no glyph swapping).
          if (top !== undefined && bottom !== undefined) {
            setCell(state, cellX + x, cellY + cy, {
              char: UPPER_HALF,
              fg: top,
              bg: bottom,
              raw: true,
            });
          } else if (top !== undefined) {
            setCell(state, cellX + x, cellY + cy, {
              char: UPPER_HALF,
              fg: top,
              raw: true,
            });
          } else if (bottom !== undefined) {
            setCell(state, cellX + x, cellY + cy, {
              char: LOWER_HALF,
              fg: bottom,
              raw: true,
            });
          }
          // Both unset: fully transparent — leave the cell untouched.
        }
      }
    },
  };
}
