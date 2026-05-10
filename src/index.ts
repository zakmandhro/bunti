import * as detect from './detect';
import * as icons from './icons';
import * as layout from './layout';
import * as render from './render';
import * as utils from './utils';
import * as colors from './colors';
import * as state from './state';
import * as dsl from './dsl';

// Functional API Individual Exports
export { detectCapabilities } from './detect';
export { init, icon, nerd, register, nerdIcon, replaceEmojis, ICON_MAP, EMOJI_MAP } from './icons';
export { 
  setCell, rect, blit, box, viewport, gradient, wallpaper, 
  joinHorizontal, joinVertical, createStyle, badge, getWindow, list 
} from './layout';
export { flush, loop } from './render';
export { stripAnsi, visibleWidth, charWidth, truncate } from './utils';
export { fg, bg, rgb, createGradient, hexToRGB, PALETTE } from './colors';
export { createScreenState, resizeScreen, clearBackBuffer, ANSI } from './state';
export { render, KEYS } from './dsl';

// Type Exports
export type { TerminalCapabilities } from './detect';
export type { IconDefinition } from './icons';
export type { StyleOptions, BorderStyle, ListOptions } from './layout';
export type { ScreenOptions, RGB, Cell, ScreenState } from './state';
export type { DSLBoxOptions, BuntiContext } from './dsl';

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
};

export default bunti;
