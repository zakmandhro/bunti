/**
 * Platformer demo tests.
 *
 * 1. Physics: the demo's own pure helpers (demo/platformer-physics.ts) under
 *    a fake clock — gravity integration, swept AABB landing, the coyote
 *    window, jump buffering, and variable jump height.
 * 2. Rendering: the demo renders one full headless frame (--once) without
 *    crashing at the minimum (80x24) and showcase (120x36) viewports.
 */

import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  approach,
  clearHeld,
  createHeldKeys,
  createPlayer,
  isHeldActive,
  JUMP_HOLD_MS,
  landingPlatform,
  MOVE_HOLD_MS,
  noteHeld,
  PHYSICS,
  type PhysicsConfig,
  type Platform,
  type SimInput,
  stepPlayer,
  supportAt,
} from '../demo/platformer-physics';

/** A roomy test config so world clamps never interfere. */
const CFG: PhysicsConfig = { ...PHYSICS, minX: -1000, maxX: 1000 };

const GROUND: Platform[] = [{ x: -1000, w: 2000, top: 0 }];
const NO_INPUT: SimInput = {
  left: false,
  right: false,
  jumpPressed: false,
  jumpHeld: false,
};
const HOLD_JUMP: SimInput = { ...NO_INPUT, jumpHeld: true };

/** Fixed-dt fake clock: advances `sim` by whole frames of `dtMs`. */
function run(
  sim: ReturnType<typeof createPlayer>,
  input: SimInput,
  frames: number,
  dtMs: number,
  platforms: Platform[],
  startNow = 0,
): number {
  let now = startNow;
  for (let i = 0; i < frames; i++) {
    now += dtMs;
    stepPlayer(sim, input, dtMs, now, platforms, CFG);
  }
  return now;
}

describe('gravity integration', () => {
  test('semi-implicit Euler: vy loses gravity*dt per step and y integrates it', () => {
    const sim = createPlayer(0, 10);
    sim.grounded = false;
    const dt = 16;

    stepPlayer(sim, HOLD_JUMP, dt, dt, [], CFG);
    const expectedVy = -CFG.gravity * (dt / 1000);
    expect(sim.vy).toBeCloseTo(expectedVy, 6);
    expect(sim.y).toBeCloseTo(10 + expectedVy * (dt / 1000), 6);

    stepPlayer(sim, HOLD_JUMP, dt, dt * 2, [], CFG);
    expect(sim.vy).toBeCloseTo(2 * expectedVy, 6);
  });

  test('falling speed clamps at maxFall', () => {
    const sim = createPlayer(0, 500);
    sim.grounded = false;
    run(sim, HOLD_JUMP, 200, 16, []);
    expect(sim.vy).toBe(-CFG.maxFall);
  });

  test('grounded players do not accumulate gravity', () => {
    const sim = createPlayer(0, 0);
    run(sim, NO_INPUT, 30, 16, GROUND);
    expect(sim.y).toBe(0);
    expect(sim.vy).toBe(0);
    expect(sim.grounded).toBe(true);
  });
});

describe('AABB landing', () => {
  const ledge: Platform = { x: 10, w: 8, top: 4 };

  test('falling across a surface with overlap lands exactly on top', () => {
    // prevY above the top, nextY below it, horizontal overlap.
    expect(landingPlatform([ledge], 14, 1.5, 4.5, 3.7)).toBe(ledge);

    const sim = createPlayer(14, 8);
    sim.grounded = false;
    run(sim, NO_INPUT, 120, 16, [ledge]);
    expect(sim.y).toBe(4);
    expect(sim.vy).toBe(0);
    expect(sim.grounded).toBe(true);
  });

  test('reports the landing impact speed once', () => {
    const sim = createPlayer(14, 8);
    sim.grounded = false;
    let impact = 0;
    let impacts = 0;
    let now = 0;
    for (let i = 0; i < 120; i++) {
      now += 16;
      stepPlayer(sim, NO_INPUT, 16, now, [ledge], CFG);
      if (sim.landedImpact > 0) {
        impact = sim.landedImpact;
        impacts++;
      }
    }
    expect(impacts).toBe(1);
    expect(impact).toBeGreaterThan(10); // fell ~4 rows
  });

  test('no landing without horizontal overlap', () => {
    expect(landingPlatform([ledge], 25, 1.5, 4.5, 3.7)).toBeNull();
    expect(landingPlatform([ledge], 8.4, 1.5, 4.5, 3.7)).toBeNull(); // 8.4+1.5 < 10
  });

  test('platforms are one-sided: no landing while moving up through a top', () => {
    const sim = createPlayer(14, 0);
    // Jump from below the ledge: passes up through top=4 without snapping.
    stepPlayer(
      sim,
      { ...HOLD_JUMP, jumpPressed: true },
      16,
      16,
      [...GROUND, ledge],
      CFG,
    );
    expect(sim.grounded).toBe(false);
    const risingVy = sim.vy;
    expect(risingVy).toBeGreaterThan(0);
    run(sim, HOLD_JUMP, 8, 16, [...GROUND, ledge], 16);
    expect(sim.y).toBeGreaterThan(1); // still climbing, unobstructed
  });

  test('a fast fall cannot tunnel: the highest crossed surface wins', () => {
    const stack: Platform[] = [
      { x: 0, w: 40, top: 2 },
      { x: 0, w: 40, top: 5 },
    ];
    expect(landingPlatform(stack, 10, 1.5, 9, 0.5)!.top).toBe(5);
  });

  test('supportAt tracks standing and walking off an edge', () => {
    expect(supportAt([ledge], 14, 1.5, 4)).toBe(ledge);
    expect(supportAt([ledge], 25, 1.5, 4)).toBeNull(); // off the end
    expect(supportAt([ledge], 14, 1.5, 3.5)).toBeNull(); // below the surface
  });
});

describe('coyote window', () => {
  const cliff: Platform[] = [{ x: 0, w: 20, top: 0 }];

  /** Walks a sim off the cliff edge; returns the fake-clock time of the last grounded frame. */
  function walkOff(sim: ReturnType<typeof createPlayer>): number {
    const right: SimInput = { ...NO_INPUT, right: true };
    let now = 0;
    let lastGrounded = 0;
    for (let i = 0; i < 300; i++) {
      now += 16;
      stepPlayer(sim, right, 16, now, cliff, CFG);
      if (sim.grounded) lastGrounded = now;
      if (!sim.grounded && now - lastGrounded > 40) break;
    }
    expect(sim.grounded).toBe(false);
    return now;
  }

  test('a jump inside the window still fires', () => {
    const sim = createPlayer(10, 0);
    const now = walkOff(sim);
    // Within 80ms of leaving the ledge (walkOff exits ~48ms after).
    stepPlayer(
      sim,
      { ...HOLD_JUMP, jumpPressed: true },
      16,
      now + 16,
      cliff,
      CFG,
    );
    expect(sim.justJumped).toBe(true);
    // One gravity tick applies within the same step (semi-implicit Euler).
    expect(sim.vy).toBeCloseTo(CFG.jumpVel - CFG.gravity * (16 / 1000), 6);
  });

  test('a jump after the window is dead', () => {
    const sim = createPlayer(10, 0);
    const now = walkOff(sim);
    // Let more than coyoteMs elapse past the last grounded frame.
    stepPlayer(
      sim,
      NO_INPUT,
      CFG.coyoteMs + 60,
      now + CFG.coyoteMs + 60,
      cliff,
      CFG,
    );
    const later = now + CFG.coyoteMs + 76;
    stepPlayer(sim, { ...HOLD_JUMP, jumpPressed: true }, 16, later, cliff, CFG);
    expect(sim.justJumped).toBe(false);
    expect(sim.vy).toBeLessThan(0); // still falling
  });

  test('coyote is consumed by the jump — no double jump', () => {
    const sim = createPlayer(10, 0);
    stepPlayer(sim, { ...HOLD_JUMP, jumpPressed: true }, 16, 16, cliff, CFG);
    expect(sim.justJumped).toBe(true);
    stepPlayer(sim, { ...HOLD_JUMP, jumpPressed: true }, 16, 32, cliff, CFG);
    expect(sim.justJumped).toBe(false);
  });
});

describe('jump feel', () => {
  test('a jump pressed just before landing is buffered and fires on touchdown', () => {
    const sim = createPlayer(0, 3);
    sim.grounded = false;
    let now = 0;
    let jumpedAt = -1;
    let pressed = false;
    for (let i = 0; i < 100 && jumpedAt < 0; i++) {
      now += 16;
      // Press once mid-fall, within jumpBufferMs of the landing.
      const press = !pressed && sim.y < 1.2;
      if (press) pressed = true;
      stepPlayer(
        sim,
        { ...HOLD_JUMP, jumpPressed: press },
        16,
        now,
        GROUND,
        CFG,
      );
      if (sim.justJumped) jumpedAt = now;
    }
    expect(pressed).toBe(true);
    expect(jumpedAt).toBeGreaterThan(0);
    expect(sim.vy).toBeGreaterThan(0);
  });

  test('releasing the jump key caps the climb (variable height)', () => {
    const hold = createPlayer(0, 0);
    stepPlayer(hold, { ...HOLD_JUMP, jumpPressed: true }, 16, 16, GROUND, CFG);
    let now = 16;
    let holdApex = 0;
    for (let i = 0; i < 100; i++) {
      now += 16;
      stepPlayer(hold, HOLD_JUMP, 16, now, GROUND, CFG);
      holdApex = Math.max(holdApex, hold.y);
      if (hold.grounded) break;
    }

    const tap = createPlayer(0, 0);
    stepPlayer(tap, { ...NO_INPUT, jumpPressed: true }, 16, 16, GROUND, CFG);
    now = 16;
    let tapApex = 0;
    for (let i = 0; i < 100; i++) {
      now += 16;
      stepPlayer(tap, NO_INPUT, 16, now, GROUND, CFG);
      tapApex = Math.max(tapApex, tap.y);
      if (tap.grounded) break;
    }

    expect(holdApex).toBeGreaterThan(3); // full jump clears a 3-row ledge
    expect(tapApex).toBeLessThan(holdApex * 0.5); // tap is a hop
  });

  test('approach never overshoots its target', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(10, -10, 5)).toBe(5);
    expect(approach(-10, -10, 5)).toBe(-10);
  });
});

describe('held-key windows', () => {
  test('movement stays active inside MOVE_HOLD_MS and expires after', () => {
    const held = createHeldKeys();
    noteHeld(held, 'right', 1000);
    expect(isHeldActive(held, 'right', 1000 + MOVE_HOLD_MS)).toBe(true);
    expect(isHeldActive(held, 'right', 1001 + MOVE_HOLD_MS)).toBe(false);
  });

  test('the jump window is tighter than the movement window', () => {
    const held = createHeldKeys();
    noteHeld(held, 'jump', 1000);
    expect(JUMP_HOLD_MS).toBeLessThan(MOVE_HOLD_MS);
    expect(isHeldActive(held, 'jump', 1000 + JUMP_HOLD_MS)).toBe(true);
    expect(isHeldActive(held, 'jump', 1001 + JUMP_HOLD_MS)).toBe(false);
  });

  test('a release clears the hold instantly', () => {
    const held = createHeldKeys();
    noteHeld(held, 'left', 1000);
    clearHeld(held, 'left');
    expect(isHeldActive(held, 'left', 1001)).toBe(false);
  });
});

// --- Headless rendering -------------------------------------------------------

const DEMO = resolve(import.meta.dir, '..', 'demo', 'platformer.ts');
const ANSI_PATTERN = /\x1b(?:\[[0-9;?]*[a-zA-Z]|\][^\x07]*\x07)/g;

async function renderOnce(size: string) {
  const proc = Bun.spawn(['bun', DEMO, '--once', '--size', size], {
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, BUNTI_NO_HINTS: '1' },
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { exitCode, stderr, plain: stdout.replace(ANSI_PATTERN, '') };
}

describe('platformer demo (headless)', () => {
  test('renders a full frame at 80x24', async () => {
    const { exitCode, stderr, plain } = await renderOnce('80x24');
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(plain).toContain('STARHOP');
    expect(plain).toContain('0/14');
    expect(plain).toContain('space jump');
    expect(plain).toContain('▀'); // tiles painted
  }, 20_000);

  test('renders a full frame at 120x36', async () => {
    const { exitCode, stderr, plain } = await renderOnce('120x36');
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(plain).toContain('STARHOP');
    expect(plain).toContain('q quit');
  }, 20_000);

  test('shows the resize hint below the minimum viewport', async () => {
    const { exitCode, stderr, plain } = await renderOnce('50x12');
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(plain).toContain('starhop needs at least');
  }, 20_000);
});
