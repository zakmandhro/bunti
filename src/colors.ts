/**
 * Bunti Semantic & Palette Color System
 */

import { RGB } from './state';

export interface Gradient {
  colors: RGB[];
  direction: 'vertical' | 'horizontal';
  steps: number;
}

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
  'bunti-blue': '33',
  'deep-navy': '17',
  nebula: '61',
  plasma: '129',

  // Semantic
  success: '40',
  warning: '214',
  error: '196',
  info: '39',

  // Accents
  gold: '220',
  rose: '211',
  mint: '121'
} as const;

const RGB_REGISTRY: Record<string, RGB> = {
  black:   { r: 0, g: 0, b: 0 },
  red:     { r: 200, g: 50, b: 50 },
  green:   { r: 50, g: 200, b: 50 },
  yellow:  { r: 200, g: 200, b: 50 },
  blue:    { r: 50, g: 50, b: 200 },
  magenta: { r: 200, g: 50, b: 200 },
  cyan:    { r: 50, g: 200, b: 200 },
  white:   { r: 255, g: 255, b: 255 },
  gray:    { r: 128, g: 128, b: 128 },
  // Greyscale
  slate:   { r: 40, g: 44, b: 52 },
  ash:     { r: 75, g: 82, b: 99 },
  silver:  { r: 188, g: 192, b: 204 },
  // Deep Blues & Space
  midnight: { r: 15, g: 15, b: 35 },
  ocean:    { r: 20, g: 40, b: 80 },
  sky:      { r: 0, g: 135, b: 255 },
  'bunti-blue': { r: 0, g: 119, b: 190 },
  'deep-navy':  { r: 0, g: 51, b: 102 },
  nebula:   { r: 95, g: 95, b: 175 },
  plasma:   { r: 135, g: 0, b: 255 },
  // Semantic
  success: { r: 0, g: 215, b: 0 },
  warning: { r: 255, g: 175, b: 0 },
  error:   { r: 215, g: 0, b: 0 },
  info:    { r: 0, g: 175, b: 255 },
  // Accents
  gold: { r: 255, g: 215, b: 0 },
  rose: { r: 255, g: 175, b: 175 },
  mint: { r: 175, g: 255, b: 175 }
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
  gray: '244'
};

export type PaletteColor = keyof typeof PALETTE;

/**
 * Parses a hex color string (#RRGGBB or #RGB) to an RGB object.
 */
export function hexToRGB(hex: string): RGB {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16)
    };
  }
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

/**
 * Resolves a palette name, color code, or RGB object to a string for ANSI.
 */
export function resolveColor(color: PaletteColor | string | number | RGB): string | number {
  if (typeof color === 'object' && 'r' in color) {
    return `2;${color.r};${color.g};${color.b}`;
  }
  if (typeof color === 'string') {
    if (color.startsWith('#')) {
      const rgb = hexToRGB(color);
      return `2;${rgb.r};${rgb.g};${rgb.b}`;
    }
    return (PALETTE as any)[color] || NAME_TO_ANSI[color] || color;
  }
  return color;
}

/**
 * Creates a multi-stop gradient (array of RGB objects) between multiple colors.
 */
export function createGradient(
  arg1: (string | number | RGB)[] | string | number | RGB,
  arg2?: string | number | RGB | number,
  arg3?: number
): RGB[] {
  let colors: (string | number | RGB)[] = [];
  let steps = 5;

  if (Array.isArray(arg1)) {
    colors = arg1;
    steps = typeof arg2 === 'number' ? arg2 : 5;
  } else if (arg1 && arg2) {
    colors = [arg1, arg2 as any];
    steps = typeof arg3 === 'number' ? arg3 : 5;
  }

  if (colors.length === 0) return [];
  if (colors.length === 1) return Array(steps).fill(resolveColorToRGB(colors[0]));
  if (steps <= 1) return [resolveColorToRGB(colors[0])];

  const result: RGB[] = [];
  const rgbColors = colors.map(resolveColorToRGB);
  
  for (let i = 0; i < steps; i++) {
    const globalT = i / (steps - 1);
    const segmentCount = rgbColors.length - 1;
    const segmentIdx = Math.min(Math.floor(globalT * segmentCount), segmentCount - 1);
    
    const start = rgbColors[segmentIdx];
    const end = rgbColors[segmentIdx + 1];
    const t = (globalT * segmentCount) - segmentIdx;
    
    result.push({
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t),
    });
  }
  
  return result;
}

/**
 * Helper to resolve any color type to an RGB object.
 */
function resolveColorToRGB(color: any): RGB {
  if (typeof color === 'object' && 'r' in color) return color;
  if (typeof color === 'string' && color.startsWith('#')) return hexToRGB(color);
  
  // 1. Check registry
  if (typeof color === 'string' && RGB_REGISTRY[color]) return RGB_REGISTRY[color];
  
  // 2. Check Palette
  const paletteValue = (PALETTE as any)[color];
  if (paletteValue) {
    // If palette value is a name, look it up in registry
    const registered = RGB_REGISTRY[color];
    if (registered) return registered;
  }

  // Fallback
  return { r: 128, g: 128, b: 128 };
}

/**
 * Adjusts the brightness of a color.
 */
export function adjustBrightness(color: any, amount: number): RGB {
  const rgb = resolveColorToRGB(color);
  const factor = 1 + (amount / 100);
  return {
    r: Math.max(0, Math.min(255, Math.round(rgb.r * factor))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g * factor))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b * factor)))
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
 * Returns an ANSI escape sequence for a color.
 */
export function fg(color: any, text: string): string {
  const code = resolveColor(color);
  const prefix = (typeof color === 'object' || (typeof color === 'string' && color.startsWith('#'))) ? '38' : '38;5';
  return `\x1b[${prefix};${code}m${text}\x1b[0m`;
}

export function bg(color: any, text: string): string {
  const code = resolveColor(color);
  const prefix = (typeof color === 'object' || (typeof color === 'string' && color.startsWith('#'))) ? '48' : '48;5';
  return `\x1b[${prefix};${code}m${text}\x1b[0m`;
}
