/**
 * Bunti Semantic Theme System
 *
 * Themes are sets of semantic color tokens (background, primary, danger, ...)
 * rather than hardcoded colors. Every token is a ThemeColor: callable as an
 * fg-styler (`theme.primary('text')` returns an ANSI-colored string) AND
 * usable as plain color data anywhere a color is accepted (bgColor,
 * borderColor, wallpaper, gradient stops) via its `.rgb` / `.hex` payload.
 *
 * `createTheme(partial)` fills missing tokens by derivation so sparse inputs
 * (e.g. a converted VS Code theme with only a handful of colors) still
 * produce a coherent theme.
 */

import {
  type ColorValue,
  contrastText,
  fade,
  fg,
  isThemeColor,
  relativeLuminance,
  resolveColorToRGB,
  rgbToHex,
  THEME_COLOR,
} from './colors';
import type { RGB } from './state';

export type ThemeMode = 'dark' | 'light';

/** Any value accepted as a theme token: name, hex, ANSI code, RGB, ThemeColor. */
export type ThemeColorInput = ColorValue;

/**
 * A semantic theme color. Callable as a foreground styler —
 * `theme.primary('Mission Control')` returns an fg-styled ANSI string — and
 * carries `.rgb` / `.hex` so it is accepted anywhere a color value goes.
 */
export type ThemeColor = ((text: string | number) => string) & {
  /** Resolved 24-bit color value. */
  readonly rgb: RGB;
  /** Resolved #rrggbb hex string. */
  readonly hex: string;
};

/** The semantic token names every Theme carries. */
export const THEME_TOKENS = [
  'background',
  'surface',
  'surfaceRaised',
  'foreground',
  'muted',
  'primary',
  'onPrimary',
  'accent',
  'border',
  'focus',
  'selection',
  'success',
  'warning',
  'danger',
  'info',
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

/**
 * A complete semantic theme. Build one with `createTheme()`.
 */
export interface Theme {
  name: string;
  mode: ThemeMode;
  background: ThemeColor;
  surface: ThemeColor;
  surfaceRaised: ThemeColor;
  foreground: ThemeColor;
  muted: ThemeColor;
  primary: ThemeColor;
  onPrimary: ThemeColor;
  accent: ThemeColor;
  border: ThemeColor;
  focus: ThemeColor;
  selection: ThemeColor;
  success: ThemeColor;
  warning: ThemeColor;
  danger: ThemeColor;
  info: ThemeColor;
  gradients?: Record<string, (string | RGB)[]>;
}

/**
 * Sparse theme spec: any subset of tokens; the rest are derived by
 * `createTheme()`.
 */
export type ThemeInput = Partial<Record<ThemeToken, ThemeColorInput>> & {
  name?: string;
  mode?: ThemeMode;
  gradients?: Record<string, (string | RGB)[]>;
};

/**
 * Creates a ThemeColor from any color value: a function that fg-styles text,
 * branded and carrying `.rgb` + `.hex`. ThemeColor inputs pass through
 * unchanged.
 */
export function themeColor(input: ThemeColorInput): ThemeColor {
  if (isThemeColor(input)) return input;
  const rgb = Object.freeze(resolveColorToRGB(input)) as RGB;
  const color = ((text: string | number) =>
    fg(rgb, String(text))) as ThemeColor;
  Object.defineProperties(color, {
    rgb: { value: rgb, enumerable: true },
    hex: { value: rgbToHex(rgb), enumerable: true },
    [THEME_COLOR]: { value: true },
  });
  return color;
}

/**
 * Returns true when the value is a complete Theme (all tokens are branded
 * ThemeColors), as opposed to a sparse ThemeInput.
 */
export function isTheme(value: unknown): value is Theme {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    THEME_TOKENS.every((token) => isThemeColor(candidate[token]))
  );
}

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

/**
 * Builds a complete Theme from a sparse spec. Missing tokens are derived:
 *
 * - mode: from background luminance when a background is given, else 'dark'.
 * - background: #0f0f23 (dark) / #f4f5f9 (light).
 * - surface / surfaceRaised: background shifted 8% / 16% toward white in
 *   dark mode, toward black in light mode.
 * - foreground: WCAG auto-contrast vs background, softened 8% toward it.
 * - muted: foreground mixed 45% toward background.
 * - primary: bunti-blue #3bbce1 (dark) / #0d7ea6 (light).
 * - onPrimary: WCAG auto-contrast (pure black/white) vs primary.
 * - accent: primary shifted 25% toward white (dark) / black (light).
 * - border: foreground mixed 70% toward background.
 * - focus: primary.
 * - selection: primary mixed 70% toward background.
 * - success/warning/danger/info: PALETTE-derived defaults per mode.
 */
export function createTheme(input: ThemeInput = {}): Theme {
  const mode: ThemeMode =
    input.mode ??
    (input.background !== undefined
      ? relativeLuminance(resolveColorToRGB(input.background)) > 0.5
        ? 'light'
        : 'dark'
      : 'dark');
  const dark = mode === 'dark';
  const lift = dark ? WHITE : BLACK;
  const shift = (base: RGB, amount: number) => fade(base, lift, amount);

  const background = themeColor(
    input.background ??
      (dark ? { r: 15, g: 15, b: 35 } : { r: 244, g: 245, b: 249 }),
  );
  const foreground = themeColor(
    input.foreground ??
      fade(contrastText(background.rgb), background.rgb, 0.08),
  );
  const primary = themeColor(
    input.primary ??
      (dark ? { r: 59, g: 188, b: 225 } : { r: 13, g: 126, b: 166 }),
  );

  const theme: Theme = {
    name: input.name ?? `custom-${mode}`,
    mode,
    background,
    surface: themeColor(input.surface ?? shift(background.rgb, 0.08)),
    surfaceRaised: themeColor(
      input.surfaceRaised ?? shift(background.rgb, 0.16),
    ),
    foreground,
    muted: themeColor(
      input.muted ?? fade(foreground.rgb, background.rgb, 0.45),
    ),
    primary,
    onPrimary: themeColor(input.onPrimary ?? contrastText(primary.rgb)),
    accent: themeColor(input.accent ?? shift(primary.rgb, 0.25)),
    border: themeColor(
      input.border ?? fade(foreground.rgb, background.rgb, 0.7),
    ),
    focus: themeColor(input.focus ?? primary.rgb),
    selection: themeColor(
      input.selection ?? fade(primary.rgb, background.rgb, 0.7),
    ),
    success: themeColor(
      input.success ??
        (dark ? { r: 0, g: 215, b: 0 } : { r: 15, g: 157, b: 60 }),
    ),
    warning: themeColor(
      input.warning ??
        (dark ? { r: 255, g: 175, b: 0 } : { r: 178, g: 107, b: 0 }),
    ),
    danger: themeColor(
      input.danger ??
        (dark ? { r: 215, g: 0, b: 0 } : { r: 198, g: 40, b: 40 }),
    ),
    info: themeColor(
      input.info ??
        (dark ? { r: 0, g: 175, b: 255 } : { r: 11, g: 120, b: 194 }),
    ),
  };
  if (input.gradients) theme.gradients = input.gradients;
  return theme;
}

function themeToInput(theme: Theme): ThemeInput {
  const input: ThemeInput = { name: theme.name, mode: theme.mode };
  for (const token of THEME_TOKENS) input[token] = theme[token];
  if (theme.gradients) input.gradients = theme.gradients;
  return input;
}

/**
 * Normalizes a Theme | ThemeInput. Full Themes pass through. Sparse inputs
 * overlay `base` when given (used by `ctx.themed`), otherwise they are
 * completed by `createTheme` derivation (used by `ctx.setTheme`).
 */
export function resolveTheme(input: Theme | ThemeInput, base?: Theme): Theme {
  if (isTheme(input)) return input;
  return base
    ? createTheme({ ...themeToInput(base), ...input })
    : createTheme(input);
}

/**
 * Built-in dark theme, derived from Bunti's PALETTE aesthetic
 * (midnight / silver / bunti-blue / plasma).
 */
export const darkTheme: Theme = createTheme({
  name: 'bunti-dark',
  mode: 'dark',
  background: 'midnight',
  foreground: 'silver',
  primary: 'bunti-blue',
  accent: 'plasma',
});

/**
 * Built-in light theme: the PALETTE aesthetic re-balanced for light
 * backgrounds (deepened primary/semantic colors for WCAG contrast).
 */
export const lightTheme: Theme = createTheme({
  name: 'bunti-light',
  mode: 'light',
  background: '#f4f5f9',
  foreground: '#23283b',
  primary: '#0d7ea6',
  accent: '#8a2bd8',
});
