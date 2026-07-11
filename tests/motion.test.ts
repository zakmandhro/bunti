import { describe, expect, test } from 'bun:test';
import { setColorTier } from '../src/detect';
import { createScreenContext } from '../src/dsl';
import { easeInQuad, easeOutCubic } from '../src/easing';
import { createScreenState, type ScreenState } from '../src/state';

setColorTier('truecolor');

// Long durations keep Date.now() drift (1-2ms per assertion) negligible.
const DUR = 10_000;

function ctxFor(state: ScreenState) {
  return createScreenContext(state);
}

describe('animate: easing + yoyo', () => {
  test('applies a custom easing curve to progress', () => {
    const state = createScreenState();
    state.startTime = Date.now() - DUR / 2;
    const ctx = ctxFor(state);

    expect(ctx.animate(DUR)).toBeCloseTo(0.5, 2);
    expect(ctx.animate(DUR, { easing: easeInQuad })).toBeCloseTo(0.25, 2);
  });

  test('boolean loop wraps as before (back-compat)', () => {
    const state = createScreenState();
    state.startTime = Date.now() - DUR * 1.2;
    const ctx = ctxFor(state);

    expect(ctx.animate(DUR, { loop: true })).toBeCloseTo(0.2, 2);
  });

  test("loop 'yoyo' rises then falls over two durations", () => {
    const state = createScreenState();

    state.startTime = Date.now() - DUR * 0.5; // first leg, rising
    expect(ctxFor(state).animate(DUR, { loop: 'yoyo' })).toBeCloseTo(0.5, 2);

    state.startTime = Date.now() - DUR * 1.2; // second leg, falling
    expect(ctxFor(state).animate(DUR, { loop: 'yoyo' })).toBeCloseTo(0.8, 2);

    state.startTime = Date.now() - DUR * 1.9; // near the end of the fall
    expect(ctxFor(state).animate(DUR, { loop: 'yoyo' })).toBeCloseTo(0.1, 2);
  });

  test('delay still gates the start', () => {
    const state = createScreenState();
    state.startTime = Date.now() - 100;
    const ctx = ctxFor(state);

    expect(ctx.animate(DUR, { delay: 5000, easing: easeOutCubic })).toBe(0);
  });
});

describe('transition', () => {
  const KEY = '_motion:transition:modal';

  test('starts at 0 and animates in when first seen visible', () => {
    const state = createScreenState();
    const first = ctxFor(state).transition('modal', true, { duration: DUR });
    expect(first.progress).toBeCloseTo(0, 2);
    expect(first.mounted).toBe(true);

    // Rewind the flip timestamp: halfway through the enter leg.
    const rec = state.componentState.get(KEY);
    rec.flippedAt = Date.now() - DUR / 2;
    const mid = ctxFor(state).transition('modal', true, { duration: DUR });
    expect(mid.progress).toBeCloseTo(0.5, 2);
    expect(mid.mounted).toBe(true);
  });

  test('first seen hidden: unmounted with zero progress', () => {
    const state = createScreenState();
    const result = ctxFor(state).transition('modal', false, { duration: DUR });
    expect(result.progress).toBe(0);
    expect(result.mounted).toBe(false);
  });

  test('stays mounted through the exit and unmounts at the end', () => {
    const state = createScreenState();
    // Fully entered long ago.
    state.componentState.set(KEY, {
      visible: true,
      flippedAt: Date.now() - DUR * 2,
    });

    // Flip to hidden: retargets, then rewind to mid-exit.
    const flipped = ctxFor(state).transition('modal', false, {
      duration: DUR,
      exitDuration: DUR,
    });
    expect(flipped.progress).toBeCloseTo(1, 2);
    expect(flipped.mounted).toBe(true);

    const rec = state.componentState.get(KEY);
    rec.flippedAt = Date.now() - DUR / 2;
    const mid = ctxFor(state).transition('modal', false, {
      duration: DUR,
      exitDuration: DUR,
    });
    expect(mid.progress).toBeCloseTo(0.5, 2);
    expect(mid.mounted).toBe(true);

    rec.flippedAt = Date.now() - DUR * 1.5;
    const done = ctxFor(state).transition('modal', false, {
      duration: DUR,
      exitDuration: DUR,
    });
    expect(done.progress).toBe(0);
    expect(done.mounted).toBe(false);
  });

  test('mid-enter flip retargets the exit from current progress', () => {
    const state = createScreenState();
    // 30% into the enter leg.
    state.componentState.set(KEY, {
      visible: true,
      flippedAt: Date.now() - DUR * 0.3,
    });

    const flipped = ctxFor(state).transition('modal', false, {
      duration: DUR,
      exitDuration: DUR,
    });
    // Exit continues from ~0.3 instead of restarting at 1.
    expect(flipped.progress).toBeCloseTo(0.3, 2);
    expect(flipped.mounted).toBe(true);
  });

  test('applies easing to the eased progress', () => {
    const state = createScreenState();
    state.componentState.set(KEY, {
      visible: true,
      flippedAt: Date.now() - DUR / 2,
    });
    const result = ctxFor(state).transition('modal', true, {
      duration: DUR,
      easing: easeInQuad,
    });
    expect(result.progress).toBeCloseTo(0.25, 2);
  });
});

describe('stagger', () => {
  test('offsets each index by delay against elapsed time', () => {
    const state = createScreenState();
    state.startTime = Date.now() - 1000;
    const ctx = ctxFor(state);

    expect(ctx.stagger(0, { delay: 400, duration: 1000 })).toBe(1);
    expect(ctx.stagger(1, { delay: 400, duration: 1000 })).toBeCloseTo(0.6, 2);
    expect(ctx.stagger(2, { delay: 400, duration: 1000 })).toBeCloseTo(0.2, 2);
    expect(ctx.stagger(3, { delay: 400, duration: 1000 })).toBe(0);
  });

  test('id option drives the cascade from a restartable clock', () => {
    const state = createScreenState();
    state.startTime = Date.now() - 50_000; // screen clock long past
    state.componentState.set('cascade_start', Date.now() - 1000);
    const ctx = ctxFor(state);

    expect(
      ctx.stagger(1, { delay: 400, duration: 1000, id: 'cascade' }),
    ).toBeCloseTo(0.6, 2);
  });
});

describe('restartAnimation', () => {
  test('resets an animate() id clock to now', () => {
    const state = createScreenState();
    state.componentState.set('boot_start', Date.now() - DUR * 2);
    const ctx = ctxFor(state);

    expect(ctx.animate(DUR, { id: 'boot' })).toBe(1);
    ctx.restartAnimation('boot');
    expect(ctx.animate(DUR, { id: 'boot' })).toBeCloseTo(0, 2);
  });

  test('requests a rerender tick', () => {
    const state = createScreenState();
    let ticks = 0;
    (state as { requestTick?: () => void }).requestTick = () => ticks++;

    ctxFor(state).restartAnimation('boot');
    expect(ticks).toBeGreaterThanOrEqual(1);
  });
});

describe('flicker (time-based)', () => {
  test('is deterministic within the same interval bucket', () => {
    const state = createScreenState();
    const ctx = ctxFor(state);

    const a = ctx.flicker(0.5, { id: 'x', interval: 60_000 });
    const b = ctx.flicker(0.5, { id: 'x', interval: 60_000 });
    expect(a).toBe(b);
  });

  test('intensity 0 never flickers', () => {
    const state = createScreenState();
    const ctx = ctxFor(state);
    expect(ctx.flicker(0)).toBe(false);
  });

  test('ids decorrelate flicker streams', () => {
    const state = createScreenState();
    state.startTime = Date.now();
    const ctx = ctxFor(state);

    // Across many buckets, two ids must not be identical everywhere.
    // (Deterministic hash: this scans buckets via interval variation.)
    let differs = false;
    for (let i = 1; i <= 64 && !differs; i++) {
      const a = ctx.flicker(0.5, { id: `a${i}`, interval: 60_000 });
      const b = ctx.flicker(0.5, { id: `b${i}`, interval: 60_000 });
      if (a !== b) differs = true;
    }
    expect(differs).toBe(true);
  });
});

describe('frame timing (dt / frame)', () => {
  test('exposes loop-stamped dt and frame counters', () => {
    const state = createScreenState();
    state.dt = 42;
    state.frameCount = 7;
    const ctx = ctxFor(state);

    expect(ctx.dt).toBe(42);
    expect(ctx.frame).toBe(7);
  });

  test('defaults to 0 outside a render loop', () => {
    const state = createScreenState();
    const ctx = ctxFor(state);

    expect(ctx.dt).toBe(0);
    expect(ctx.frame).toBe(0);
  });
});
