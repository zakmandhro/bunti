/**
 * Halfblock pixel canvas tests: pixel-pair -> cell mapping ('▀'/'▄'),
 * transparency of unset pixels, odd-height edges, and screen clipping.
 */

import { describe, expect, test } from 'bun:test';
import { setColorTier } from '../src/detect';
import { createPixelCanvas } from '../src/index';
import { rect } from '../src/layout';
import { createScreenState, type ScreenState } from '../src/state';

// Pin the color tier so expectations don't depend on the host terminal env.
setColorTier('truecolor');

const RED = { r: 255, g: 0, b: 0 };
const BLUE = { r: 0, g: 0, b: 255 };
const GREEN = { r: 0, g: 128, b: 0 };

function makeState(width = 10, height = 4): ScreenState {
  const state = createScreenState();
  state.width = width;
  state.height = height;
  return state;
}

function cellAt(state: ScreenState, x: number, y: number) {
  return state.backBuffer[y * state.width + x]!;
}

describe('createPixelCanvas', () => {
  test('a fully set pixel pair renders ▀ with fg=top and bg=bottom RGB', () => {
    const px = createPixelCanvas(2, 2);
    px.set(0, 0, RED);
    px.set(0, 1, BLUE);
    px.set(1, 0, GREEN);
    px.set(1, 1, RED);

    const state = makeState();
    px.blitTo(state, 0, 0);

    const c0 = cellAt(state, 0, 0);
    expect(c0.char).toBe('▀');
    expect(c0.fg).toEqual(RED);
    expect(c0.bg).toEqual(BLUE);
    expect(c0.fgCode).toBe('2;255;0;0');
    expect(c0.bgCode).toBe('2;0;0;255');

    const c1 = cellAt(state, 1, 0);
    expect(c1.char).toBe('▀');
    expect(c1.fg).toEqual(GREEN);
    expect(c1.bg).toEqual(RED);
  });

  test('top-only renders ▀ and bottom-only renders ▄, unset half transparent', () => {
    const px = createPixelCanvas(2, 2);
    px.set(0, 0, RED); // top only
    px.set(1, 1, BLUE); // bottom only

    const state = makeState();
    px.blitTo(state, 0, 0);

    const top = cellAt(state, 0, 0);
    expect(top.char).toBe('▀');
    expect(top.fg).toEqual(RED);
    expect(top.bg).toBeUndefined();

    const bottom = cellAt(state, 1, 0);
    expect(bottom.char).toBe('▄');
    expect(bottom.fg).toEqual(BLUE);
    expect(bottom.bg).toBeUndefined();
  });

  test('half-set pairs keep the underlying cell background for the unset half', () => {
    const state = makeState();
    rect(state, 0, 0, state.width, state.height, { char: ' ', bg: GREEN });
    const bgBefore = cellAt(state, 0, 0).bg;

    const px = createPixelCanvas(1, 2);
    px.set(0, 0, RED); // top only — bottom half must show the green wash

    px.blitTo(state, 0, 0);

    const cell = cellAt(state, 0, 0);
    expect(cell.char).toBe('▀');
    expect(cell.fg).toEqual(RED);
    expect(cell.bg).toEqual(bgBefore);
  });

  test('fully unset pairs leave the cell untouched (sprite holes composite)', () => {
    const state = makeState();
    rect(state, 0, 0, state.width, state.height, { char: '.', bg: GREEN });
    const bgBefore = cellAt(state, 1, 0).bg;

    const px = createPixelCanvas(3, 2);
    // Column 0 and 2 fully set, column 1 is a hole.
    px.set(0, 0, RED);
    px.set(0, 1, RED);
    px.set(2, 0, BLUE);
    px.set(2, 1, BLUE);

    px.blitTo(state, 0, 0);

    expect(cellAt(state, 0, 0).char).toBe('▀');
    expect(cellAt(state, 2, 0).char).toBe('▀');
    // The hole shows the background exactly as it was painted.
    const hole = cellAt(state, 1, 0);
    expect(hole.char).toBe('.');
    expect(hole.bg).toEqual(bgBefore);
  });

  test('odd canvas heights leave the final missing bottom half transparent', () => {
    const px = createPixelCanvas(1, 3);
    px.set(0, 0, RED);
    px.set(0, 1, BLUE);
    px.set(0, 2, GREEN); // last row: top half of cell row 1, no bottom pixel

    const state = makeState();
    px.blitTo(state, 0, 0);

    const row0 = cellAt(state, 0, 0);
    expect(row0.char).toBe('▀');
    expect(row0.fg).toEqual(RED);
    expect(row0.bg).toEqual(BLUE);

    const row1 = cellAt(state, 0, 1);
    expect(row1.char).toBe('▀');
    expect(row1.fg).toEqual(GREEN);
    expect(row1.bg).toBeUndefined();
  });

  test('blitTo clips at the screen bounds without throwing', () => {
    const state = makeState(4, 2);
    const px = createPixelCanvas(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) px.set(x, y, RED);
    }

    // Partially off every edge: only the overlap is painted.
    expect(() => px.blitTo(state, -1, -1)).not.toThrow();
    expect(() => px.blitTo(state, 3, 1)).not.toThrow();

    // (-1,-1): canvas column 1+, cell row 1+ land on screen from (0,0).
    expect(cellAt(state, 0, 0).char).toBe('▀');
    // (3,1): only screen cell (3,1) is inside.
    expect(cellAt(state, 3, 1).char).toBe('▀');
  });

  test('set() ignores out-of-range pixels and clear() resets the canvas', () => {
    const px = createPixelCanvas(2, 2);
    expect(() => px.set(-1, 0, RED)).not.toThrow();
    expect(() => px.set(2, 0, RED)).not.toThrow();
    expect(() => px.set(0, 2, RED)).not.toThrow();

    px.set(0, 0, RED);
    px.clear();

    const state = makeState();
    const charBefore = cellAt(state, 0, 0).char;
    px.blitTo(state, 0, 0);
    expect(cellAt(state, 0, 0).char).toBe(charBefore);
  });
});
