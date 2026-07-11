/**
 * Dev diagnostics tests: every hint triggers into the buffer (never straight
 * to stderr mid-frame), drains once on flush, and respects the suppression
 * flags (NODE_ENV=production, BUNTI_NO_HINTS=1).
 *
 * tests/preload.ts sets BUNTI_NO_HINTS=1 suite-wide; these tests re-enable
 * hints per-test (the flag is read at record time, not import time).
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { resolveColor } from '../src/colors';
import { setColorTier } from '../src/detect';
import {
  __bufferedHints,
  __resetHints,
  beginHookFrame,
  drainHints,
  flushHints,
  hintInputReadWithoutKeyboard,
  hintKeyboardStdinNotTTY,
  hintOverlappingBoxes,
  hintsSuppressed,
  nearestMatch,
  recordHint,
  recordKeylessHook,
} from '../src/diagnostics';
import { createScreenContext } from '../src/dsl';
import { createScreenState, type ScreenOptions } from '../src/state';

setColorTier('truecolor');

const savedNoHints = process.env.BUNTI_NO_HINTS;
const savedNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  process.env.BUNTI_NO_HINTS = '0';
  __resetHints();
  drainHints(); // clear any lazily-registered flusher output too
});

afterEach(() => {
  __resetHints();
  drainHints();
  process.env.BUNTI_NO_HINTS = savedNoHints;
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
});

/** Captures process.stderr.write calls while fn runs. */
function captureStderr(fn: () => void): string {
  const original = process.stderr.write;
  let out = '';
  process.stderr.write = ((chunk: any) => {
    out += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return out;
}

function makeState(options: ScreenOptions = {}) {
  const state = createScreenState(options);
  state.width = 80;
  state.height = 24;
  return state;
}

describe('diagnostics core (buffering + suppression)', () => {
  test('recordHint buffers without writing to stderr', () => {
    const written = captureStderr(() => {
      recordHint('test hint');
    });
    expect(written).toBe('');
    expect(__bufferedHints()).toContain('test hint');
  });

  test('hints are deduplicated by message', () => {
    recordHint('same');
    recordHint('same');
    expect(__bufferedHints().filter((h) => h === 'same').length).toBe(1);
  });

  test('flushHints writes the buffered block to stderr once', () => {
    recordHint('flushed hint');
    const first = captureStderr(() => flushHints());
    expect(first).toContain('[bunti] dev hints');
    expect(first).toContain('flushed hint');
    const second = captureStderr(() => flushHints());
    expect(second).toBe('');
  });

  test('BUNTI_NO_HINTS=1 suppresses recording', () => {
    process.env.BUNTI_NO_HINTS = '1';
    expect(hintsSuppressed()).toBe(true);
    recordHint('never recorded');
    expect(__bufferedHints()).toEqual([]);
  });

  test('NODE_ENV=production suppresses recording', () => {
    process.env.NODE_ENV = 'production';
    expect(hintsSuppressed()).toBe(true);
    recordHint('never recorded');
    expect(__bufferedHints()).toEqual([]);
  });

  test('nearestMatch suggests close names and rejects far ones', () => {
    expect(nearestMatch('midnite', ['midnight', 'ocean'])).toBe('midnight');
    expect(nearestMatch('rocket', ['rocket'])).toBe('rocket');
    expect(nearestMatch('zzz', ['midnight', 'ocean'])).toBeUndefined();
  });
});

describe('hint 1: input read without keyboard/mouse enabled', () => {
  const HINT =
    'keyboard input read but { keyboard: true } not set in render options';

  test('reading ctx.lastKey without keyboard/mouse buffers the hint', () => {
    const ctx = createScreenContext(makeState());
    void ctx.lastKey;
    expect(__bufferedHints()).toContain(HINT);
  });

  test('ctx.keys, keyPressed, and isKeyHeld also trigger it', () => {
    for (const read of [
      (c: ReturnType<typeof createScreenContext>) => void c.keys,
      (c: ReturnType<typeof createScreenContext>) => c.keyPressed('a'),
      (c: ReturnType<typeof createScreenContext>) => c.isKeyHeld('a'),
    ]) {
      __resetHints();
      read(createScreenContext(makeState()));
      expect(__bufferedHints()).toContain(HINT);
    }
  });

  test('no hint when keyboard or mouse is enabled', () => {
    for (const options of [{ keyboard: true }, { mouse: true }]) {
      const ctx = createScreenContext(makeState(options));
      void ctx.lastKey;
      void ctx.keys;
      ctx.keyPressed('a');
      expect(__bufferedHints()).toEqual([]);
    }
  });

  test('building the screen context alone never fakes an input read', () => {
    const ctx = createScreenContext(makeState());
    ctx.box({ width: 10, height: 3, x: 0, y: 0 }, (s) => s.text('hi'));
    ctx.flushFlow();
    expect(__bufferedHints()).toEqual([]);
  });

  test('suppressed by BUNTI_NO_HINTS=1', () => {
    process.env.BUNTI_NO_HINTS = '1';
    const ctx = createScreenContext(makeState());
    void ctx.lastKey;
    expect(__bufferedHints()).toEqual([]);
  });

  test('direct helper respects the option check', () => {
    hintInputReadWithoutKeyboard({ keyboard: true });
    expect(__bufferedHints()).toEqual([]);
    hintInputReadWithoutKeyboard({});
    expect(__bufferedHints()).toContain(HINT);
  });
});

describe('hint 2: keyboard requested but stdin is not a TTY', () => {
  const HINT =
    'keyboard requested but stdin is not a TTY (piped input is ignored); ' +
    'run in a real terminal or PTY';

  test('buffers when keyboard is requested on a non-TTY stdin', () => {
    const written = captureStderr(() => {
      hintKeyboardStdinNotTTY(true, false);
    });
    expect(written).toBe('');
    expect(__bufferedHints()).toContain(HINT);
  });

  test('silent when stdin is a TTY or keyboard was not requested', () => {
    hintKeyboardStdinNotTTY(true, true);
    hintKeyboardStdinNotTTY(false, false);
    expect(__bufferedHints()).toEqual([]);
  });

  test('suppressed in production', () => {
    process.env.NODE_ENV = 'production';
    hintKeyboardStdinNotTTY(true, false);
    expect(__bufferedHints()).toEqual([]);
  });
});

describe('hint 3: keyless hook-order drift', () => {
  const HINT =
    'conditional keyless useState detected — pass a stable string key';

  test('warns when the keyless hook count shrinks between frames', () => {
    const state = makeState();
    const frame = (draw: (ctx: any) => void) => {
      const ctx = createScreenContext(state);
      draw(ctx);
      ctx.flushFlow();
    };
    frame((ctx) => {
      ctx.useState(0);
      ctx.useState('');
    });
    frame((ctx) => {
      ctx.useState(0); // second keyless hook conditionally skipped
    });
    frame(() => {}); // comparison happens at the next frame boundary
    expect(__bufferedHints()).toContain(HINT);
  });

  test('warns when a slot changes type between frames', () => {
    const state = makeState();
    beginHookFrame(state);
    recordKeylessHook(state, 0, 'useState');
    beginHookFrame(state);
    recordKeylessHook(state, 0, 'useAsync');
    beginHookFrame(state);
    expect(__bufferedHints()).toContain(HINT);
  });

  test('stable keyless hooks and keyed hooks never warn', () => {
    const state = makeState();
    for (let i = 0; i < 3; i++) {
      const ctx = createScreenContext(state);
      ctx.useState(0);
      ctx.useState('keyed', 1);
      ctx.flushFlow();
    }
    expect(__bufferedHints()).toEqual([]);
  });

  test('suppressed by BUNTI_NO_HINTS=1', () => {
    process.env.BUNTI_NO_HINTS = '1';
    const state = makeState();
    beginHookFrame(state);
    recordKeylessHook(state, 0, 'useState');
    beginHookFrame(state);
    beginHookFrame(state);
    expect(__bufferedHints()).toEqual([]);
  });
});

describe('hint 4: unknown palette color names', () => {
  test('unknown name hints once with a nearest-match suggestion', () => {
    const written = captureStderr(() => {
      resolveColor('midnite');
      resolveColor('midnite'); // reported once
    });
    expect(written).toBe('');
    const hits = __bufferedHints().filter((h) => h.includes("'midnite'"));
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain("did you mean 'midnight'");
  });

  test('valid names, hex, numeric codes, and RGB stay silent', () => {
    resolveColor('midnight');
    resolveColor('#ff00ff');
    resolveColor('38');
    resolveColor(38);
    resolveColor({ r: 1, g: 2, b: 3 });
    expect(__bufferedHints()).toEqual([]);
  });
});

describe('hint 5: overlapping boxes without layers', () => {
  const HINT =
    'overlapping boxes detected — use ctx.layer() or zIndex for overlays';

  test('two direct boxes painting the same cells hint once', () => {
    const state = makeState();
    const ctx = createScreenContext(state);
    ctx.box({ x: 0, y: 0, width: 20, height: 5 }, (s) => s.text('a'));
    ctx.box({ x: 10, y: 2, width: 20, height: 5 }, (s) => s.text('b'));
    const written = captureStderr(() => ctx.flushFlow());
    expect(written).toBe('');
    expect(__bufferedHints()).toContain(HINT);

    // Latch: later frames stop checking once the hint is recorded.
    drainHints();
    const ctx2 = createScreenContext(state);
    ctx2.box({ x: 0, y: 0, width: 20, height: 5 }, (s) => s.text('a'));
    ctx2.box({ x: 10, y: 2, width: 20, height: 5 }, (s) => s.text('b'));
    ctx2.flushFlow();
    expect(__bufferedHints()).toEqual([]);
  });

  test('disjoint boxes never hint', () => {
    const ctx = createScreenContext(makeState());
    ctx.box({ x: 0, y: 0, width: 10, height: 3 }, (s) => s.text('a'));
    ctx.box({ x: 20, y: 10, width: 10, height: 3 }, (s) => s.text('b'));
    ctx.flushFlow();
    expect(__bufferedHints()).toEqual([]);
  });

  test('zIndex boxes composite as layers and never hint', () => {
    const ctx = createScreenContext(makeState());
    ctx.box({ x: 0, y: 0, width: 20, height: 5 }, (s) => s.text('a'));
    ctx.box({ x: 10, y: 2, width: 20, height: 5, zIndex: 10 }, (s) =>
      s.text('b'),
    );
    ctx.flushFlow();
    expect(__bufferedHints()).toEqual([]);
  });

  test('direct helper: suppression flag and zero-area rects', () => {
    hintOverlappingBoxes([
      { x: 0, y: 0, width: 0, height: 0 },
      { x: 0, y: 0, width: 5, height: 5 },
    ]);
    expect(__bufferedHints()).toEqual([]);

    process.env.BUNTI_NO_HINTS = '1';
    hintOverlappingBoxes([
      { x: 0, y: 0, width: 5, height: 5 },
      { x: 1, y: 1, width: 5, height: 5 },
    ]);
    expect(__bufferedHints()).toEqual([]);
  });
});
