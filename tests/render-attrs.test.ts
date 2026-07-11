/**
 * SGR text attribute tests: blit parsing into cell attrs, and flush emission
 * via renderFrame() — the exported diff/assembly half of flush() that returns
 * the ANSI string without touching stdout (flush() is renderFrame + write).
 */

import { describe, expect, test } from 'bun:test';
import { setColorTier } from '../src/detect';
import { blit } from '../src/layout';
import { renderFrame } from '../src/render';
import { createScreenState, type ScreenState } from '../src/state';
import { colors } from '../src/vendor/colors';

setColorTier('truecolor');

/** A small screen whose front/back buffers agree (nothing dirty). */
function makeState(width = 20, height = 3): ScreenState {
  const state = createScreenState();
  state.width = width;
  state.height = height;
  const blank = () => ({ char: ' ', skip: false });
  state.frontBuffer = Array.from({ length: width * height }, blank);
  state.backBuffer = Array.from({ length: width * height }, blank);
  return state;
}

describe('blit parses SGR text attributes into cells', () => {
  test('italic / underline / strike / dim set and clear', () => {
    const state = makeState();
    blit(
      state,
      0,
      0,
      '\x1b[3mI\x1b[23m\x1b[4mU\x1b[24m\x1b[9mS\x1b[29m\x1b[2mD',
    );

    expect(state.backBuffer[0]).toMatchObject({ char: 'I', italic: true });
    expect(state.backBuffer[1]).toMatchObject({ char: 'U', underline: true });
    expect(state.backBuffer[1]?.italic).toBeFalsy();
    expect(state.backBuffer[2]).toMatchObject({ char: 'S', strike: true });
    expect(state.backBuffer[2]?.underline).toBeFalsy();
    expect(state.backBuffer[3]).toMatchObject({ char: 'D', dim: true });
    expect(state.backBuffer[3]?.strike).toBeFalsy();
  });

  test('SGR 22 clears both bold and dim', () => {
    const state = makeState();
    blit(state, 0, 0, '\x1b[1m\x1b[2mA\x1b[22mB');

    expect(state.backBuffer[0]).toMatchObject({
      char: 'A',
      bold: true,
      dim: true,
    });
    expect(state.backBuffer[1]?.bold).toBeFalsy();
    expect(state.backBuffer[1]?.dim).toBeFalsy();
  });

  test('SGR 0 resets every attribute', () => {
    const state = makeState();
    blit(state, 0, 0, '\x1b[1m\x1b[3m\x1b[4m\x1b[9m\x1b[2mA\x1b[0mB');

    expect(state.backBuffer[0]).toMatchObject({
      char: 'A',
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      dim: true,
    });
    const b = state.backBuffer[1]!;
    expect(b.char).toBe('B');
    expect(b.bold).toBeFalsy();
    expect(b.italic).toBeFalsy();
    expect(b.underline).toBeFalsy();
    expect(b.strike).toBeFalsy();
    expect(b.dim).toBeFalsy();
  });
});

describe('renderFrame emits SGR attribute sequences', () => {
  test('italic turns on with 3 and off with 23 across frames', () => {
    const state = makeState();

    blit(state, 0, 0, colors.italic('hi'));
    const first = renderFrame(state);
    expect(first).toContain('\x1b[3mhi');
    expect(first).not.toContain('\x1b[23m');

    // Second frame: same cells without italic -> emitter must close it.
    blit(state, 0, 0, 'hi');
    const second = renderFrame(state);
    expect(second).toContain('\x1b[23mhi');
  });

  test('underline and strike emit 4/24 and 9/29', () => {
    const state = makeState();
    blit(state, 0, 0, '\x1b[4mU\x1b[24m\x1b[9mS');

    const out = renderFrame(state);
    expect(out).toContain('\x1b[4mU');
    expect(out).toContain('\x1b[24m\x1b[9mS');
  });

  test('bold and dim are emitted jointly: 22 re-asserts the survivor', () => {
    const state = makeState();
    // A: bold+dim, B: bold only. Turning dim off forces SGR 22 (which
    // clears BOTH) followed by a bold re-assert.
    blit(state, 0, 0, '\x1b[1m\x1b[2mA\x1b[22m\x1b[1mB');

    const out = renderFrame(state);
    expect(out).toContain('\x1b[1m\x1b[2mA');
    expect(out).toContain('\x1b[22m\x1b[1mB');
  });

  test('dropping bold while dim stays re-asserts dim after 22', () => {
    const state = makeState();
    // A: bold+dim, B: dim only.
    blit(state, 0, 0, '\x1b[1m\x1b[2mA\x1b[22m\x1b[2mB');

    const out = renderFrame(state);
    expect(out).toContain('\x1b[22m\x1b[2mB');
  });

  test('dim alone closes with a bare 22', () => {
    const state = makeState();
    blit(state, 0, 0, '\x1b[2mA\x1b[22mB');

    const out = renderFrame(state);
    expect(out).toContain('\x1b[2mA\x1b[22mB');
  });

  test('the color-reset path (SGR 0) re-asserts active attributes', () => {
    const state = makeState();
    // A: red italic; B: italic only. Clearing the fg emits 0m, which wipes
    // italic — the emitter must re-assert 3m before drawing B.
    blit(state, 0, 0, '\x1b[31m\x1b[3mA\x1b[39mB');

    const out = renderFrame(state);
    expect(out).toContain('A\x1b[0m\x1b[3mB');
  });

  test('attribute trackers persist across flushes on the state', () => {
    const state = makeState();
    blit(state, 0, 0, colors.italic('x'));
    renderFrame(state);
    expect(state.lastItalic).toBe(true);

    blit(state, 5, 0, colors.italic('y'));
    const out = renderFrame(state);
    // Italic is already active on the terminal: no redundant 3m.
    expect(out).not.toContain('\x1b[3m');
  });
});

describe('vendored colors round-trip through the cell pipeline', () => {
  test('colors.italic -> cell.italic -> \\x1b[3m emission', () => {
    const state = makeState();
    blit(state, 0, 0, colors.italic('hi'));

    expect(state.backBuffer[0]).toMatchObject({ char: 'h', italic: true });
    expect(state.backBuffer[1]).toMatchObject({ char: 'i', italic: true });
    expect(renderFrame(state)).toContain('\x1b[3m');
  });

  test('colors.underline and colors.dim round-trip', () => {
    const state = makeState();
    blit(state, 0, 0, colors.underline('u'));
    blit(state, 2, 0, colors.dim('d'));

    expect(state.backBuffer[0]).toMatchObject({ char: 'u', underline: true });
    expect(state.backBuffer[2]).toMatchObject({ char: 'd', dim: true });

    const out = renderFrame(state);
    expect(out).toContain('\x1b[4mu');
    expect(out).toContain('\x1b[2m');
  });

  test('nested bold(dim(...)) keeps both attributes on the cell', () => {
    const state = makeState();
    blit(state, 0, 0, colors.bold(colors.dim('x')));

    expect(state.backBuffer[0]).toMatchObject({
      char: 'x',
      bold: true,
      dim: true,
    });
  });
});
