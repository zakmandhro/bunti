/**
 * Platformer demo physics — pure, engine-free helpers for demo/platformer.ts,
 * unit-tested with a fake clock in tests/platformer.test.ts.
 *
 * This is deliberately demo-side code: Bunti ships rendering primitives, not
 * game APIs. Everything here is plain math over plain objects.
 *
 * Units and conventions:
 * - x is in terminal columns, y is in rows ABOVE the ground line (up = +).
 * - Velocities are cells/second; timestamps and durations are milliseconds.
 * - `now` is always passed in (never read from Date.now) so tests can drive
 *   the clock, and stepPlayer mutates the sim in place so the render loop
 *   allocates nothing per frame.
 */

/** One solid, one-sided surface: land on `top` when falling across it. */
export interface Platform {
  /** Left edge, in columns. */
  x: number;
  /** Width, in columns. */
  w: number;
  /** Surface height in rows above the ground line (ground segments use 0). */
  top: number;
}

/** Game-feel constants for stepPlayer. */
export interface PhysicsConfig {
  /** Downward acceleration, rows/s^2. */
  gravity: number;
  /** Target horizontal run speed, cells/s. */
  moveSpeed: number;
  /** Horizontal acceleration toward the input direction, cells/s^2. */
  accel: number;
  /** Horizontal deceleration with no input, cells/s^2. */
  decel: number;
  /** Initial upward jump velocity, rows/s. */
  jumpVel: number;
  /** Rising speed cap applied while the jump key is NOT held (variable jump height). */
  jumpCutVel: number;
  /** Grace window after walking off a ledge in which a jump still works. */
  coyoteMs: number;
  /** A jump pressed this long before landing still fires on touchdown. */
  jumpBufferMs: number;
  /** Terminal falling speed, rows/s. */
  maxFall: number;
  /** Player half-width for platform overlap tests, in columns. */
  halfW: number;
  /** World clamp, in columns. */
  minX: number;
  maxX: number;
}

export const PHYSICS: PhysicsConfig = {
  gravity: 42,
  moveSpeed: 19,
  accel: 70,
  decel: 110,
  jumpVel: 17.5,
  jumpCutVel: 6,
  coyoteMs: 80,
  jumpBufferMs: 120,
  maxFall: 30,
  halfW: 1.5,
  minX: 2,
  maxX: 214,
};

/** Per-frame input snapshot fed to stepPlayer. */
export interface SimInput {
  left: boolean;
  right: boolean;
  /** True on the frame a jump key was pressed (edge, not level). */
  jumpPressed: boolean;
  /** True while the jump key is considered held (level). */
  jumpHeld: boolean;
}

/** The player simulation state. Mutated in place by stepPlayer. */
export interface PlayerSim {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  /** Last direction of travel (1 right, -1 left) — render-side flavor. */
  facing: 1 | -1;
  /** Timestamp of the most recent grounded frame (drives coyote time). */
  lastGroundedAt: number;
  /** Timestamp of the most recent jump press (drives jump buffering). */
  jumpBufferedAt: number;
  /** True once the current airtime has consumed its coyote jump. */
  coyoteSpent: boolean;
  /** Set by stepPlayer: this step fired a jump. */
  justJumped: boolean;
  /** Set by stepPlayer: downward impact speed (rows/s) if this step landed. */
  landedImpact: number;
}

/** A fresh sim standing at (x, y). */
export function createPlayer(x: number, y: number): PlayerSim {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
    lastGroundedAt: 0,
    jumpBufferedAt: Number.NEGATIVE_INFINITY,
    coyoteSpent: false,
    justJumped: false,
    landedImpact: 0,
  };
}

/** Moves `current` toward `target` by at most `maxDelta` (no overshoot). */
export function approach(
  current: number,
  target: number,
  maxDelta: number,
): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

/** True when a player centered at `x` horizontally overlaps the platform. */
export function overlapsX(p: Platform, x: number, halfW: number): boolean {
  return x + halfW > p.x && x - halfW < p.x + p.w;
}

/**
 * The platform whose surface the player is standing on (y within epsilon of
 * a top it overlaps), or null when unsupported — walking off a ledge.
 */
export function supportAt(
  platforms: readonly Platform[],
  x: number,
  halfW: number,
  y: number,
): Platform | null {
  for (const p of platforms) {
    if (Math.abs(y - p.top) < 1e-6 && overlapsX(p, x, halfW)) return p;
  }
  return null;
}

/**
 * Swept AABB landing test for one integration step: of all platforms the
 * player overlaps whose surface the feet crossed while falling from prevY
 * to nextY, returns the highest (so a fast fall can't tunnel through a
 * stack of tops). Null when nothing was crossed. Callers gate on vy <= 0 —
 * platforms are one-sided and jumping up through them is allowed.
 */
export function landingPlatform(
  platforms: readonly Platform[],
  x: number,
  halfW: number,
  prevY: number,
  nextY: number,
): Platform | null {
  let best: Platform | null = null;
  for (const p of platforms) {
    if (!overlapsX(p, x, halfW)) continue;
    if (prevY >= p.top && nextY <= p.top) {
      if (best === null || p.top > best.top) best = p;
    }
  }
  return best;
}

/**
 * Advances the sim by dtMs. Semi-implicit Euler for gravity, buffered +
 * coyote jumps, variable jump height via a rising-speed cap while the jump
 * key is not held, and swept landing resolution. Mutates `sim`; per-step
 * results are reported through sim.justJumped / sim.landedImpact.
 */
export function stepPlayer(
  sim: PlayerSim,
  input: SimInput,
  dtMs: number,
  now: number,
  platforms: readonly Platform[],
  cfg: PhysicsConfig = PHYSICS,
): void {
  const dt = dtMs / 1000;
  sim.justJumped = false;
  sim.landedImpact = 0;

  // --- Horizontal: accelerate toward the input direction, clamp to world.
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) sim.facing = dir as 1 | -1;
  const rate = dir !== 0 ? cfg.accel : cfg.decel;
  sim.vx = approach(sim.vx, dir * cfg.moveSpeed, rate * dt);
  sim.x = Math.min(cfg.maxX, Math.max(cfg.minX, sim.x + sim.vx * dt));

  // --- Jump: buffered presses + coyote window.
  if (input.jumpPressed) sim.jumpBufferedAt = now;
  const buffered = now - sim.jumpBufferedAt <= cfg.jumpBufferMs;
  const canJump =
    sim.grounded ||
    (!sim.coyoteSpent && now - sim.lastGroundedAt <= cfg.coyoteMs);
  if (buffered && canJump) {
    sim.vy = cfg.jumpVel;
    sim.grounded = false;
    sim.coyoteSpent = true;
    sim.jumpBufferedAt = Number.NEGATIVE_INFINITY;
    sim.justJumped = true;
  }

  // Variable jump height: while rising with the jump key released, cap the
  // climb — taps hop, holds soar.
  if (!input.jumpHeld && sim.vy > cfg.jumpCutVel) sim.vy = cfg.jumpCutVel;

  // --- Vertical: support check while grounded, integrate + land while not.
  if (sim.grounded) {
    if (supportAt(platforms, sim.x, cfg.halfW, sim.y)) {
      sim.lastGroundedAt = now;
      sim.coyoteSpent = false;
    } else {
      sim.grounded = false; // walked off a ledge; coyote clock is running
    }
  }
  if (!sim.grounded) {
    const prevY = sim.y;
    sim.vy = Math.max(sim.vy - cfg.gravity * dt, -cfg.maxFall);
    sim.y += sim.vy * dt;
    if (sim.vy <= 0) {
      const hit = landingPlatform(platforms, sim.x, cfg.halfW, prevY, sim.y);
      if (hit) {
        sim.landedImpact = -sim.vy;
        sim.y = hit.top;
        sim.vy = 0;
        sim.grounded = true;
        sim.coyoteSpent = false;
        sim.lastGroundedAt = now;
      }
    }
  }
}

// --- Held-key tracking ------------------------------------------------------

/**
 * Demo-side held-key windows. Legacy terminals report no key releases and
 * pause ~200-300ms before auto-repeat kicks in, so the engine's 150ms
 * ctx.isKeyHeld window can blink off mid-hold. Movement gets a wider grace
 * window; the jump key gets a tighter one so variable jump height still
 * reads on a quick tap.
 */
export const MOVE_HOLD_MS = 230;
export const JUMP_HOLD_MS = 140;

export type HeldAction = 'left' | 'right' | 'jump';

/** Last-seen press/repeat timestamps per action. */
export type HeldKeys = Record<HeldAction, number>;

export function createHeldKeys(): HeldKeys {
  return {
    left: Number.NEGATIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    jump: Number.NEGATIVE_INFINITY,
  };
}

/** Records a press/repeat of `action` at `now`. */
export function noteHeld(held: HeldKeys, action: HeldAction, now: number) {
  held[action] = now;
}

/** Clears `action` immediately (a real or synthetic key release). */
export function clearHeld(held: HeldKeys, action: HeldAction) {
  held[action] = Number.NEGATIVE_INFINITY;
}

/** True while `action`'s last press is inside its hold window. */
export function isHeldActive(
  held: HeldKeys,
  action: HeldAction,
  now: number,
  windowMs = action === 'jump' ? JUMP_HOLD_MS : MOVE_HOLD_MS,
): boolean {
  return now - held[action] <= windowMs;
}
