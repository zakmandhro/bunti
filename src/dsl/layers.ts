/**
 * Bunti DSL layer machinery: transparent buffers, layer screen states,
 * painted-bounds tracking, and back-buffer compositing.
 */

import type { Rect } from '../geometry';
import type { Cell, ScreenState } from '../state';

function createTransparentBuffer(size: number): Cell[] {
  return Array.from({ length: size }, () => ({
    char: ' ',
    fg: undefined,
    bg: undefined,
    fgCode: undefined,
    bgCode: undefined,
    bold: false,
    italic: false,
    underline: false,
    dim: false,
    strike: false,
    skip: true,
  }));
}

export function createLayerScreenState(state: ScreenState): ScreenState {
  const size = state.width * state.height;
  return {
    ...state,
    frontBuffer: createTransparentBuffer(size),
    backBuffer: createTransparentBuffer(size),
  };
}

/**
 * Whether a layer-buffer cell holds painted content. Transparent cells are
 * skip cells with the pristine ' ' char; painted wide-glyph tails are skip
 * cells too but carry the '' char, so they count as content.
 */
function isPainted(cell: Cell): boolean {
  return !cell.skip || cell.char === '';
}

/**
 * Tight min/max bounds of a layer buffer's painted cells, or null when the
 * layer painted nothing. Used at composite time to place drop shadows.
 */
export function layerContentBounds(buffer: Cell[], width: number): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;

  const height = Math.floor(buffer.length / width);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      if (!isPainted(buffer[rowOffset + x]!)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function compositeLayer(state: ScreenState, buffer: Cell[]) {
  for (let i = 0; i < buffer.length; i++) {
    const source = buffer[i]!;
    // Transparent cells never composite; painted wide-glyph tails
    // (skip + '' char) must, or stale chars peek through under the glyph.
    if (!isPainted(source)) continue;

    const target = state.backBuffer[i]!;
    target.char = source.char;
    target.fg = source.fg;
    target.bg = source.bg;
    target.bold = source.bold;
    target.italic = source.italic;
    target.underline = source.underline;
    target.dim = source.dim;
    target.strike = source.strike;
    target.fgCode = source.fgCode;
    target.bgCode = source.bgCode;
    target.skip = source.skip;
    target.raw = source.raw;
  }
}
