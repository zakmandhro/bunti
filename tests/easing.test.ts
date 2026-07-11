import { describe, expect, test } from 'bun:test';
import {
  clamp01,
  easeInCubic,
  easeInOutCubic,
  easeInOutQuad,
  easeInOutQuart,
  easeInQuad,
  easeInQuart,
  easeOutBack,
  easeOutBounce,
  easeOutCubic,
  easeOutElastic,
  easeOutExpo,
  easeOutQuad,
  easeOutQuart,
  lerp,
  lerpRect,
  linear,
} from '../src/easing';

const CURVES = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeOutExpo,
  easeOutElastic,
  easeOutBounce,
  easeOutBack,
};

describe('easing curves', () => {
  test('every curve hits 0 at t=0 and 1 at t=1', () => {
    for (const [name, curve] of Object.entries(CURVES)) {
      expect(curve(0), `${name}(0)`).toBeCloseTo(0, 6);
      expect(curve(1), `${name}(1)`).toBeCloseTo(1, 6);
    }
  });

  test('every curve clamps out-of-range input', () => {
    for (const [name, curve] of Object.entries(CURVES)) {
      expect(curve(-2), `${name}(-2)`).toBeCloseTo(curve(0), 6);
      expect(curve(3), `${name}(3)`).toBeCloseTo(curve(1), 6);
    }
  });

  test('in curves start slow, out curves start fast', () => {
    expect(easeInQuad(0.25)).toBeLessThan(0.25);
    expect(easeInCubic(0.25)).toBeLessThan(easeInQuad(0.25));
    expect(easeInQuart(0.25)).toBeLessThan(easeInCubic(0.25));
    expect(easeOutQuad(0.25)).toBeGreaterThan(0.25);
    expect(easeOutCubic(0.25)).toBeGreaterThan(easeOutQuad(0.25));
    expect(easeOutQuart(0.25)).toBeGreaterThan(easeOutCubic(0.25));
    expect(easeOutExpo(0.25)).toBeGreaterThan(0.8);
  });

  test('inOut curves are symmetric around the midpoint', () => {
    for (const curve of [easeInOutQuad, easeInOutCubic, easeInOutQuart]) {
      expect(curve(0.5)).toBeCloseTo(0.5, 6);
      expect(curve(0.25) + curve(0.75)).toBeCloseTo(1, 6);
    }
  });

  test('easeOutBack overshoots past 1 before settling', () => {
    const peak = Math.max(
      ...Array.from({ length: 99 }, (_, i) => easeOutBack((i + 1) / 100)),
    );
    expect(peak).toBeGreaterThan(1);
  });

  test('easeOutElastic oscillates around 1 near the end', () => {
    const samples = Array.from({ length: 40 }, (_, i) =>
      easeOutElastic(0.3 + (i / 40) * 0.7),
    );
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(Math.min(...samples)).toBeLessThan(1);
  });

  test('easeOutBounce stays within [0, 1] and touches segment peaks', () => {
    for (let i = 0; i <= 100; i++) {
      const v = easeOutBounce(i / 100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.0000001);
    }
    expect(easeOutBounce(0.5)).toBeCloseTo(0.765625, 5);
  });

  test('clamp01 clamps to the unit interval', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });
});

describe('lerp helpers', () => {
  test('lerp interpolates and clamps t', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(0);
    expect(lerp(0, 10, 2)).toBe(10);
    expect(lerp(-10, 10, 0.75)).toBe(5);
  });

  test('lerpRect interpolates all fields and rounds to whole cells', () => {
    const a = { x: 0, y: 0, width: 10, height: 4 };
    const b = { x: 10, y: 5, width: 20, height: 8 };

    expect(lerpRect(a, b, 0)).toEqual(a);
    expect(lerpRect(a, b, 1)).toEqual(b);
    expect(lerpRect(a, b, 0.5)).toEqual({ x: 5, y: 3, width: 15, height: 6 });
    // 0.25 -> x 2.5 rounds to 3, y 1.25 rounds to 1
    expect(lerpRect(a, b, 0.25)).toEqual({
      x: 3,
      y: 1,
      width: 13,
      height: 5,
    });
  });
});
