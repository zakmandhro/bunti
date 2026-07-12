import * as colors from './colors';
import * as detect from './detect';
import * as dsl from './dsl';
import * as easing from './easing';
import * as geometry from './geometry';
import * as icons from './icons';
import * as input from './input';
import * as layout from './layout';
import * as render from './render';
import * as state from './state';
import * as theme from './theme';
import * as utils from './utils';

export type { ColorValue, Gradient } from './colors';
export {
  ansi256ToRGB,
  bg,
  contrastText,
  createGradient,
  fade,
  fg,
  hexToRGB,
  isThemeColor,
  PALETTE,
  relativeLuminance,
  resolveColor,
  resolveColorToRGB,
  rgb,
  rgbTo16,
  rgbTo256,
  rgbToHex,
} from './colors';
// Full Nerd Fonts name union (type-only; the glyph map itself is only
// loaded via the '@zakmandhro/bunti/icons-full' subpath).
export type { IconName } from './data/nf-names';
// Type Exports
export type {
  ColorTier,
  NerdFontPolicy,
  TerminalApp,
  TerminalCapabilities,
  TerminalProfile,
} from './detect';
// Functional API Individual Exports
export {
  colorTier,
  detectCapabilities,
  detectColorTier,
  identifyTerminal,
  setColorTier,
} from './detect';
export type {
  BuntiContext,
  DSLBoxOptions,
  LayerOptions,
  TypewriterOptions,
  TypewriterState,
} from './dsl';
/** createScreenContext is the headless-testing entry point: pair it with
 *  createScreenState + renderFrame to assert on frames without a TTY. */
export { createScreenContext, KEYS, render } from './dsl';
export {
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
} from './easing';
export type {
  PlacedRectInput,
  PlacedRectOptions,
  Rect,
  RectInput,
  SplitOptions,
} from './geometry';
export {
  innerRect,
  resolvePlacedRect,
  resolveRect,
  splitRect,
} from './geometry';
export type {
  BuntiIconName,
  CuratedIconName,
  IconDefinition,
} from './icons';
export {
  EMOJI_MAP,
  ICON_MAP,
  icon,
  init,
  nerd,
  nerdIcon,
  register,
  registerAll,
  replaceEmojis,
} from './icons';
export type {
  HeldKeyOptions,
  InputToken,
  InputTokenizerOptions,
  KeyEvent,
  TerminalResponse,
  TerminalResponseKind,
} from './input';
export { createKeyEvent, HeldKeyTracker, InputTokenizer } from './input';
export type {
  BorderStyle,
  ListOptions,
  StyleOptions,
  TableOptions,
} from './layout';
export {
  badge,
  blit,
  box,
  createStyle,
  dimRect,
  getWindow,
  gradient,
  joinHorizontal,
  joinVertical,
  list,
  rect,
  setCell,
  table,
  viewport,
  wallpaper,
} from './layout';
export {
  applyInputToState,
  drainFrameInput,
  flush,
  loop,
  renderFrame,
  restoreTerminal,
  updatePointerShape,
} from './render';
export type { Cell, RGB, ScreenOptions, ScreenState } from './state';
export {
  ANSI,
  clearBackBuffer,
  createScreenState,
  resizeScreen,
} from './state';
export type {
  Theme,
  ThemeColor,
  ThemeColorInput,
  ThemeInput,
  ThemeMode,
  ThemeToken,
} from './theme';
export {
  createTheme,
  darkTheme,
  isTheme,
  lightTheme,
  resolveTheme,
  THEME_TOKENS,
  themeColor,
} from './theme';
export {
  charWidth,
  indentBlock,
  stripAnsi,
  truncate,
  visibleWidth,
} from './utils';
export type { BuntiColor, ColorFormatter } from './vendor/colors';

/**
 * Namespaced API surface for `bunti.render(...)` style usage — every
 * named export gathered onto one object.
 * @example import { bunti } from '@zakmandhro/bunti'; await bunti.render(draw, { keyboard: true });
 */
export const bunti = {
  ...detect,
  ...icons,
  ...input,
  ...layout,
  ...render,
  ...utils,
  ...colors,
  ...state,
  ...dsl,
  ...easing,
  ...geometry,
  ...theme,
};

export default bunti;
