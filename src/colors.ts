/**
 * Bunti Semantic & Palette Color System
 */

import { colorTier } from './detect';
import type { RGB } from './state';
import type { ThemeColor } from './theme';

/**
 * A resolved multi-stop gradient, accepted anywhere bgColor is (rect fills,
 * box backgrounds, wallpaper). Build one with ctx.gradient().
 */
export interface Gradient {
  /** Interpolated RGB stops, one per step. */
  colors: RGB[];
  /** Axis the stops sweep along. */
  direction: 'vertical' | 'horizontal';
  /** Number of interpolated stops. */
  steps: number;
}

/**
 * Any value Bunti accepts where a color is expected.
 */
export type ColorValue = string | number | RGB | ThemeColor;

/**
 * Internal brand carried by ThemeColor instances so callable theme tokens can
 * be distinguished from plain function-style border wrappers.
 */
export const THEME_COLOR: unique symbol = Symbol.for('bunti.theme-color');

/**
 * Returns true when the value is a ThemeColor (callable fg-styler carrying
 * `.rgb` and `.hex`), detected via the internal brand symbol.
 */
export function isThemeColor(value: unknown): value is ThemeColor {
  return (
    typeof value === 'function' &&
    (value as unknown as Record<symbol, unknown>)[THEME_COLOR] === true
  );
}

/**
 * Bunti's named color palette (ANSI-256 codes). Any name here works as a
 * color value: `fg('bunti-blue', text)`, `{ bgColor: 'midnight' }`.
 */
export const PALETTE = {
  // Greyscale
  slate: '235',
  ash: '240',
  gray: '244',
  silver: '247',
  white: '255',
  black: '0',

  // Deep Blues & Space
  midnight: '17',
  ocean: '24',
  sky: '33',
  'bunti-blue': '38',
  'deep-navy': '17',
  nebula: '61',
  plasma: '165',

  // Semantic
  success: '40',
  warning: '214',
  error: '196',
  info: '39',

  // Accents
  gold: '220',
  rose: '211',
  mint: '121',
} as const;

const RGB_REGISTRY: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  red: { r: 200, g: 50, b: 50 },
  green: { r: 50, g: 200, b: 50 },
  yellow: { r: 200, g: 200, b: 50 },
  blue: { r: 50, g: 50, b: 200 },
  magenta: { r: 200, g: 50, b: 200 },
  cyan: { r: 50, g: 200, b: 200 },
  white: { r: 255, g: 255, b: 255 },
  gray: { r: 128, g: 128, b: 128 },
  // Greyscale
  slate: { r: 40, g: 44, b: 52 },
  ash: { r: 75, g: 82, b: 99 },
  silver: { r: 188, g: 192, b: 204 },
  // Deep Blues & Space
  midnight: { r: 15, g: 15, b: 35 },
  ocean: { r: 20, g: 40, b: 80 },
  sky: { r: 0, g: 135, b: 255 },
  'bunti-blue': { r: 59, g: 188, b: 225 },
  'deep-navy': { r: 0, g: 51, b: 102 },
  nebula: { r: 95, g: 95, b: 175 },
  plasma: { r: 201, g: 0, b: 255 },
  // Semantic
  success: { r: 0, g: 215, b: 0 },
  warning: { r: 255, g: 175, b: 0 },
  error: { r: 215, g: 0, b: 0 },
  info: { r: 0, g: 175, b: 255 },
  // Accents
  gold: { r: 255, g: 215, b: 0 },
  rose: { r: 255, g: 175, b: 175 },
  mint: { r: 175, g: 255, b: 175 },
};

// Map standard names to ANSI-256 for basic compat
const NAME_TO_ANSI: Record<string, string> = {
  red: '160',
  green: '40',
  yellow: '220',
  blue: '33',
  magenta: '165',
  cyan: '39',
  white: '255',
  black: '0',
  gray: '244',
};

export type PaletteColor = keyof typeof PALETTE;

/**
 * Parses a hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA) to an RGB
 * object. Alpha channels are composited over `base` (defaults to black), so
 * `#ffffff80` over black resolves to mid-gray.
 */
export function hexToRGB(hex: string, base: RGB = { r: 0, g: 0, b: 0 }): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) {
    let expanded = '';
    for (const c of h) expanded += c + c;
    h = expanded;
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (h.length === 8) {
    const a = parseInt(h.substring(6, 8), 16) / 255;
    return {
      r: Math.round(r * a + base.r * (1 - a)),
      g: Math.round(g * a + base.g * (1 - a)),
      b: Math.round(b * a + base.b * (1 - a)),
    };
  }
  return { r, g, b };
}

/**
 * Formats an RGB object as a #rrggbb hex string.
 */
export function rgbToHex(rgb: RGB): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

// Exact xterm 256-color model: 16 base colors + 6x6x6 cube + 24-step gray ramp.
const CUBE_LEVELS = [0, 95, 135, 175, 215, 255] as const;

const BASE16: readonly RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 128, g: 0, b: 0 },
  { r: 0, g: 128, b: 0 },
  { r: 128, g: 128, b: 0 },
  { r: 0, g: 0, b: 128 },
  { r: 128, g: 0, b: 128 },
  { r: 0, g: 128, b: 128 },
  { r: 192, g: 192, b: 192 },
  { r: 128, g: 128, b: 128 },
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 255, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 255, g: 0, b: 255 },
  { r: 0, g: 255, b: 255 },
  { r: 255, g: 255, b: 255 },
];

/**
 * Converts an ANSI-256 code to its exact xterm RGB value
 * (16 base + 6x6x6 color cube + 24-step gray ramp).
 */
export function ansi256ToRGB(code: number): RGB {
  const c = Math.max(0, Math.min(255, Math.trunc(code)));
  if (c < 16) return { ...BASE16[c]! };
  if (c < 232) {
    const n = c - 16;
    return {
      r: CUBE_LEVELS[Math.floor(n / 36)]!,
      g: CUBE_LEVELS[Math.floor(n / 6) % 6]!,
      b: CUBE_LEVELS[n % 6]!,
    };
  }
  const v = 8 + (c - 232) * 10;
  return { r: v, g: v, b: v };
}

function nearestCubeIndex(v: number): number {
  return v < 48 ? 0 : v < 115 ? 1 : Math.min(5, Math.floor((v - 35) / 40));
}

/**
 * Quantizes an RGB value to the nearest ANSI-256 code
 * (best of the 6x6x6 cube vs the gray ramp).
 */
export function rgbTo256(rgb: RGB): number {
  const ri = nearestCubeIndex(rgb.r);
  const gi = nearestCubeIndex(rgb.g);
  const bi = nearestCubeIndex(rgb.b);
  const cr = CUBE_LEVELS[ri]!;
  const cg = CUBE_LEVELS[gi]!;
  const cb = CUBE_LEVELS[bi]!;
  const cubeDist = (cr - rgb.r) ** 2 + (cg - rgb.g) ** 2 + (cb - rgb.b) ** 2;

  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  const grayIdx = Math.max(0, Math.min(23, Math.round((avg - 8) / 10)));
  const gv = 8 + grayIdx * 10;
  const grayDist = (gv - rgb.r) ** 2 + (gv - rgb.g) ** 2 + (gv - rgb.b) ** 2;

  return grayDist < cubeDist ? 232 + grayIdx : 16 + 36 * ri + 6 * gi + bi;
}

/**
 * Quantizes an RGB value to the nearest of the 16 base ANSI colors.
 */
export function rgbTo16(rgb: RGB): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < 16; i++) {
    const c = BASE16[i]!;
    const dist = (c.r - rgb.r) ** 2 + (c.g - rgb.g) ** 2 + (c.b - rgb.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function quantizeRGB(
  rgb: RGB,
  tier: 'truecolor' | '256' | '16',
): string | number {
  if (tier === 'truecolor') return `2;${rgb.r};${rgb.g};${rgb.b}`;
  return tier === '256' ? rgbTo256(rgb) : rgbTo16(rgb);
}

/**
 * Resolves a palette name, color code, RGB object, or ThemeColor to an ANSI
 * color code, quantized to the active color tier. Returns undefined on the
 * 'mono' tier (NO_COLOR), which suppresses color output entirely.
 */
export function resolveColor(
  color: PaletteColor | ColorValue,
): string | number | undefined {
  const tier = colorTier();
  if (tier === 'mono') return undefined;

  const value: string | number | RGB = isThemeColor(color)
    ? color.rgb
    : (color as string | number | RGB);

  if (typeof value === 'object' && 'r' in value) {
    return quantizeRGB(value, tier);
  }
  if (typeof value === 'string') {
    if (value.startsWith('#')) {
      return quantizeRGB(hexToRGB(value), tier);
    }
    const resolved = (PALETTE as any)[value] || NAME_TO_ANSI[value] || value;
    if (tier === '16') {
      const code = Number.parseInt(String(resolved), 10);
      if (Number.isFinite(code) && code > 15) {
        return rgbTo16(ansi256ToRGB(code));
      }
    }
    return resolved;
  }
  if (tier === '16' && value > 15) return rgbTo16(ansi256ToRGB(value));
  return value;
}

/**
 * Creates a multi-stop gradient (array of RGB objects) between multiple colors.
 */
export function createGradient(
  arg1: ColorValue[] | ColorValue,
  arg2?: ColorValue | number,
  arg3?: number,
): RGB[] {
  let colors: ColorValue[] = [];
  let steps = 5;

  if (Array.isArray(arg1)) {
    colors = arg1;
    steps = typeof arg2 === 'number' ? arg2 : 5;
  } else if (arg1 && arg2) {
    colors = [arg1, arg2 as any];
    steps = typeof arg3 === 'number' ? arg3 : 5;
  }

  if (colors.length === 0) return [];
  if (colors.length === 1)
    return Array(steps).fill(resolveColorToRGB(colors[0]));
  if (steps <= 1) return [resolveColorToRGB(colors[0])];

  const result: RGB[] = [];
  const rgbColors = colors.map(resolveColorToRGB);

  for (let i = 0; i < steps; i++) {
    const globalT = i / (steps - 1);
    const segmentCount = rgbColors.length - 1;
    const segmentIdx = Math.min(
      Math.floor(globalT * segmentCount),
      segmentCount - 1,
    );

    const start = rgbColors[segmentIdx];
    const end = rgbColors[segmentIdx + 1];
    const t = globalT * segmentCount - segmentIdx;

    result.push({
      r: Math.round(start!.r + (end!.r - start!.r) * t),
      g: Math.round(start!.g + (end!.g - start!.g) * t),
      b: Math.round(start!.b + (end!.b - start!.b) * t),
    });
  }

  return result;
}

/**
 * Resolves any color value (name, hex, ANSI-256 code, RGB, ThemeColor) to an
 * exact RGB object. Numeric codes use the exact xterm 256-color table.
 */
export function resolveColorToRGB(color: unknown): RGB {
  if (isThemeColor(color)) return color.rgb;
  if (typeof color === 'object' && color !== null && 'r' in color) {
    return color as RGB;
  }
  if (typeof color === 'number') return ansi256ToRGB(color);
  if (typeof color === 'string') {
    if (color.startsWith('#')) return hexToRGB(color);
    // Resolved truecolor code ('2;r;g;b') — cells store these after
    // resolveColor(); dimRect and friends must round-trip them.
    if (color.startsWith('2;')) {
      const parts = color.split(';');
      return {
        r: Number(parts[1]) || 0,
        g: Number(parts[2]) || 0,
        b: Number(parts[3]) || 0,
      };
    }
    if (RGB_REGISTRY[color]) return RGB_REGISTRY[color];
    const paletteValue =
      (PALETTE as Record<string, string>)[color] ?? NAME_TO_ANSI[color];
    const code = Number.parseInt(paletteValue ?? color, 10);
    if (Number.isFinite(code)) return ansi256ToRGB(code);
  }

  // Fallback
  return { r: 128, g: 128, b: 128 };
}

/**
 * WCAG 2.x relative luminance (0 = black, 1 = white) of any color value.
 */
export function relativeLuminance(color: ColorValue): number {
  const { r, g, b } = resolveColorToRGB(color);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Picks pure black or pure white text for maximum WCAG contrast against the
 * given background color. (White wins below luminance ~0.179, the point where
 * both contrast ratios are equal.)
 */
export function contrastText(bgColor: ColorValue): RGB {
  return relativeLuminance(bgColor) < 0.1791
    ? { r: 255, g: 255, b: 255 }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Adjusts the brightness of a color.
 */
export function adjustBrightness(color: any, amount: number): RGB {
  const rgb = resolveColorToRGB(color);
  const factor = 1 + amount / 100;
  return {
    r: Math.max(0, Math.min(255, Math.round(rgb.r * factor))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g * factor))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b * factor))),
  };
}

/**
 * Interpolates between two colors and returns an RGB value.
 */
export function fade(from: ColorValue, to: ColorValue, progress: number): RGB {
  const start = resolveColorToRGB(from);
  const end = resolveColorToRGB(to);
  const t = Math.max(0, Math.min(1, progress));

  return {
    r: Math.round(start.r + (end.r - start.r) * t),
    g: Math.round(start.g + (end.g - start.g) * t),
    b: Math.round(start.b + (end.b - start.b) * t),
  };
}

/**
 * Returns a function that darkens a color and can be used as a style wrapper.
 */
export function darken(color: any, amount: number = 20) {
  const adjusted = adjustBrightness(color, -amount);
  return (text: string) => fg(adjusted, text);
}

/**
 * Returns a function that lightens a color and can be used as a style wrapper.
 */
export function lighten(color: any, amount: number = 20) {
  const adjusted = adjustBrightness(color, amount);
  return (text: string) => fg(adjusted, text);
}

/**
 * Returns an RGB object for TrueColor rendering.
 */
export function rgb(r: number, g: number, b: number) {
  return { r, g, b };
}

/**
 * Wraps text in a foreground-color ANSI sequence (any color value:
 * palette name, hex, ANSI-256 code, RGB, ThemeColor). On the 'mono' tier
 * the text is returned unstyled.
 * @example fg('#3bbce1', 'hello') // truecolor cyan text
 */
export function fg(color: any, text: string): string {
  const code = resolveColor(color);
  if (code === undefined) return text;
  const codeStr = String(code);
  const prefix = codeStr.startsWith('2;') ? '38' : '38;5';
  return `\x1b[${prefix};${codeStr}m${text}\x1b[0m`;
}

/**
 * Wraps text in a background-color ANSI sequence (any color value). On the
 * 'mono' tier the text is returned unstyled.
 */
export function bg(color: any, text: string): string {
  const code = resolveColor(color);
  if (code === undefined) return text;
  const codeStr = String(code);
  const prefix = codeStr.startsWith('2;') ? '48' : '48;5';
  return `\x1b[${prefix};${codeStr}m${text}\x1b[0m`;
}
