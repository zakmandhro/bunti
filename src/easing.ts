/**
 * Bunti Easing Curves & Interpolation
 *
 * The standard easing set, every curve clamps its input to [0, 1] so raw
 * animation progress can be fed in directly. Pure functions only.
 */

import type { Rect } from './geometry';

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function linear(value: number): number {
  return clamp01(value);
}

// --- Quad ---

export function easeInQuad(value: number): number {
  const t = clamp01(value);
  return t * t;
}

export function easeOutQuad(value: number): number {
  const t = clamp01(value);
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// --- Cubic ---

export function easeInCubic(value: number): number {
  const t = clamp01(value);
  return t * t * t;
}

export function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

export function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// --- Quart ---

export function easeInQuart(value: number): number {
  const t = clamp01(value);
  return t * t * t * t;
}

export function easeOutQuart(value: number): number {
  const t = clamp01(value);
  return 1 - (1 - t) ** 4;
}

export function easeInOutQuart(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2;
}

// --- Expressive ---

export function easeOutExpo(value: number): number {
  const t = clamp01(value);
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

export function easeOutElastic(value: number): number {
  const t = clamp01(value);
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(value: number): number {
  const t = clamp01(value);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const u = t - 1.5 / d1;
    return n1 * u * u + 0.75;
  }
  if (t < 2.5 / d1) {
    const u = t - 2.25 / d1;
    return n1 * u * u + 0.9375;
  }
  const u = t - 2.625 / d1;
  return n1 * u * u + 0.984375;
}

export function easeOutBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

// --- Interpolation ---

/** Linear interpolation between a and b. t is clamped to [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

/**
 * Interpolates between two rects, rounding every field to whole cells so
 * results can be drawn directly to the terminal grid.
 */
export function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: Math.round(lerp(a.x, b.x, t)),
    y: Math.round(lerp(a.y, b.y, t)),
    width: Math.round(lerp(a.width, b.width, t)),
    height: Math.round(lerp(a.height, b.height, t)),
  };
}
