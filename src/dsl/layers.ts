/**
 * Bunti DSL layer machinery: transparent buffers, layer screen states, and
 * back-buffer compositing.
 */

import type { Cell, ScreenState } from '../state';

function createTransparentBuffer(size: number): Cell[] {
  return Array.from({ length: size }, () => ({
    char: ' ',
    fg: undefined,
    bg: undefined,
    fgCode: undefined,
    bgCode: undefined,
    bold: false,
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

export function compositeLayer(state: ScreenState, buffer: Cell[]) {
  for (let i = 0; i < buffer.length; i++) {
    const source = buffer[i]!;
    if (source.skip) continue;

    const target = state.backBuffer[i]!;
    target.char = source.char;
    target.fg = source.fg;
    target.bg = source.bg;
    target.bold = source.bold;
    target.fgCode = source.fgCode;
    target.bgCode = source.bgCode;
    target.skip = source.skip;
    target.raw = source.raw;
  }
}
