/**
 * Frame idempotence: a settled static frame must emit ZERO bytes from
 * renderFrame, no matter how its colors were produced.
 *
 * Regression guard for the non-idempotent dirty check: renderFrame used to
 * compare raw cell fg/bg, which hold RGB OBJECTS when a truecolor SGR
 * (38;2;r;g;b / 48;2;r;g;b) is parsed by blit — themed text, list selection
 * washes, fade(). Those objects are rebuilt every frame, so reference
 * inequality repainted visually identical cells forever (~1.5KB/frame on a
 * static themed list). The dirty check now compares the resolved
 * fgCode/bgCode (string | number | undefined), which is exactly what the
 * emitter outputs.
 */

import { describe, expect, test } from 'bun:test';
import { setColorTier } from '../src/detect';
import { createScreenContext } from '../src/dsl';
import { blit, dimRect, setCell } from '../src/layout';
import { renderFrame } from '../src/render';
import {
  type Cell,
  clearBackBuffer,
  createScreenState,
  type ScreenState,
} from '../src/state';
import { tokyoNight } from '../src/themes';

setColorTier('truecolor');

/** ScreenState with deterministic dimensions and matching buffers. */
function makeState(width = 80, height = 24): ScreenState {
  const state = createScreenState({ theme: tokyoNight });
  state.width = width;
  state.height = height;
  const cell = (): Cell => ({ char: ' ', bold: false, skip: false });
  state.backBuffer = Array.from({ length: width * height }, cell);
  state.frontBuffer = Array.from({ length: width * height }, cell);
  return state;
}

/** One full frame through the real pipeline; returns renderFrame's output. */
function frame(state: ScreenState, draw: (ctx: any) => void): string {
  clearBackBuffer(state);
  const ctx = createScreenContext(state);
  draw(ctx);
  ctx.flushFlow();
  return renderFrame(state);
}

/** The static themed app from the benchmark: selected list row + boxes. */
function staticThemedApp(ctx: any) {
  const { theme } = ctx;
  ctx.wallpaper(theme.background);
  ctx.box(
    {
      x: 2,
      y: 1,
      width: 40,
      height: 10,
      border: 'rounded',
      borderColor: theme.border,
      title: 'SERVICES',
      titleStyle: theme.muted,
      padding: [1, 2],
    },
    (s: any) => {
      s.list('services', ['api-gateway', 'auth-service', 'billing'], {
        focusedIndex: 1,
        interactive: false,
      });
    },
  );
  ctx.box(
    {
      x: 45,
      y: 1,
      width: 30,
      height: 6,
      border: 'rounded',
      borderColor: theme.border,
    },
    (s: any) => {
      s.text(theme.muted('status  ') + theme.success('HEALTHY'));
    },
  );
}

describe('settled static frames emit zero bytes', () => {
  test('themed list with selection + themed boxes: frames 3+ are empty', () => {
    const state = makeState();
    frame(state, staticThemedApp); // frame 1: initial paint
    frame(state, staticThemedApp); // frame 2: settle
    for (let i = 3; i <= 10; i++) {
      expect(frame(state, staticThemedApp)).toBe('');
    }
  });

  test('truecolor SGR strings re-blitted each frame stay clean', () => {
    // blit parses 38;2/48;2 into fresh RGB objects every call — the exact
    // allocation pattern that defeated the old reference-equality check.
    const state = makeState(20, 3);
    const content = '\x1b[38;2;170;80;255m\x1b[48;2;16;16;20mhi';
    blit(state, 0, 0, content);
    expect(renderFrame(state)).not.toBe('');
    blit(state, 0, 0, content);
    expect(renderFrame(state)).toBe('');
  });
});

describe('value changes still repaint (dirty check stays accurate)', () => {
  test('same char with a different fg is dirty', () => {
    const state = makeState(20, 3);
    setCell(state, 0, 0, { char: 'A', fg: { r: 200, g: 100, b: 50 } });
    renderFrame(state);
    setCell(state, 0, 0, { char: 'A', fg: { r: 10, g: 20, b: 30 } });
    const out = renderFrame(state);
    expect(out).toContain('\x1b[38;2;10;20;30m');
  });

  test('dimRect diffs against the undimmed frame and back', () => {
    const state = makeState(20, 3);
    const paint = () =>
      setCell(state, 0, 0, {
        char: 'A',
        fg: { r: 200, g: 100, b: 50 },
        bg: { r: 100, g: 100, b: 100 },
      });

    paint();
    renderFrame(state);

    // Frame 2: dimmed -> repaints with the scaled colors.
    paint();
    dimRect(state, { x: 0, y: 0, width: 1, height: 1 }, 0.5);
    const dimmed = renderFrame(state);
    expect(dimmed).toContain('\x1b[38;2;100;50;25m');
    expect(dimmed).toContain('\x1b[48;2;50;50;50m');

    // Frame 3: dim removed -> repaints with the originals.
    paint();
    const restored = renderFrame(state);
    expect(restored).toContain('\x1b[38;2;200;100;50m');
    expect(restored).toContain('\x1b[48;2;100;100;100m');

    // Frame 4: identical dim-free frame -> settled, zero bytes.
    paint();
    expect(renderFrame(state)).toBe('');
  });

  test('clearing a colored cell back to blank is dirty', () => {
    const state = makeState(20, 3);
    setCell(state, 0, 0, { char: 'A', fg: '#ff0000' });
    renderFrame(state);
    clearBackBuffer(state);
    const out = renderFrame(state);
    // Both fg and bg cleared -> the emitter takes the SGR 0 reset path.
    expect(out).toContain('\x1b[0m');
  });
});
