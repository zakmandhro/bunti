import * as colors from './colors';
import * as detect from './detect';
import * as dsl from './dsl';
import * as geometry from './geometry';
import * as icons from './icons';
import * as layout from './layout';
import * as render from './render';
import * as state from './state';
import * as utils from './utils';

export { bg, createGradient, fg, hexToRGB, PALETTE, rgb } from './colors';
// Type Exports
export type { TerminalCapabilities } from './detect';
// Functional API Individual Exports
export { detectCapabilities } from './detect';
export type { BuntiContext, DSLBoxOptions } from './dsl';
export { KEYS, render } from './dsl';
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
export type { IconDefinition } from './icons';
export {
  EMOJI_MAP,
  ICON_MAP,
  icon,
  init,
  nerd,
  nerdIcon,
  register,
  replaceEmojis,
} from './icons';
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
export { flush, loop } from './render';
export type { Cell, RGB, ScreenOptions, ScreenState } from './state';
export {
  ANSI,
  clearBackBuffer,
  createScreenState,
  resizeScreen,
} from './state';
export { charWidth, stripAnsi, truncate, visibleWidth } from './utils';

// Namespaced export for bunti.render style usage
export const bunti = {
  ...detect,
  ...icons,
  ...layout,
  ...render,
  ...utils,
  ...colors,
  ...state,
  ...dsl,
  ...geometry,
};

export default bunti;
