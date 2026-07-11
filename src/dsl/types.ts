/**
 * Bunti DSL shared types and constants.
 */

import type { bg, darken, fg, Gradient, lighten, rgb } from '../colors';
import type {
  PlacedRectInput,
  PlacedRectOptions,
  Rect,
  RectInput,
  SplitOptions,
} from '../geometry';
import type { KeyEvent } from '../input';
import type {
  ListOptions,
  SideColors,
  StyleOptions,
  TableOptions,
} from '../layout';
import type { Cell, Hitbox, RGB, ScreenState } from '../state';
import type { Theme, ThemeColor, ThemeInput } from '../theme';
import type { BuntiColor } from '../vendor/colors';

export const KEYS = {
  UP: 'up',
  DOWN: 'down',
  RIGHT: 'right',
  LEFT: 'left',
  ENTER: 'enter',
  ESCAPE: 'escape',
  TAB: 'tab',
  BACKSPACE: 'backspace',
  SPACE: ' ',
  HOME: 'home',
  END: 'end',
  DELETE: 'delete',
  PAGE_UP: 'pageup',
  PAGE_DOWN: 'pagedown',
  INSERT: 'insert',
};
export interface DSLBoxOptions extends StyleOptions {
  bgColor?: string | number | RGB | Gradient | ThemeColor;
  color?: string | number | RGB | ThemeColor | 'blank';
  x?: number;
  y?: number;
  zIndex?: number;
  anchor?: 'top' | 'bottom';
  size?: 'auto' | number;
  title?: string;
  titleStyle?: (s: string) => string;
  id?: string;
  borderColor?:
    | string
    | number
    | RGB
    | ThemeColor
    | ((s: string) => string)
    | SideColors;
  detach?: boolean; // If true, the string is returned but NOT appended to the flow
}

export interface TypewriterOptions {
  id?: string;
  cps?: number;
  delay?: number;
  loop?: boolean;
  cursor?: string;
  blink?: boolean;
  blinkRate?: number;
}

export interface TypewriterState {
  text: string;
  cursor: string;
  done: boolean;
  index: number;
  progress: number;
}

export interface LayerOptions {
  zIndex?: number;
}

/**
 * The interface for the contextual builder provided to closures.
 */
export interface BuntiContext {
  color: BuntiColor & {
    darken: typeof darken;
    lighten: typeof lighten;
    rgb: typeof rgb;
    fg: typeof fg;
    bg: typeof bg;
  };
  state: ScreenState;
  width: number;
  height: number;
  area: Rect;
  isRoot: boolean;
  offsetX: number;
  offsetY: number;
  readonly cursorX: number;
  readonly cursorY: number;
  mouseX: number;
  mouseY: number;
  mouseButton: number;
  isMouseDown: boolean;
  /** First unmodified key name of this frame (back-compat slot). */
  lastKey?: string;
  /** All KeyEvents of this frame (multiple keys per frame arrive whole). */
  keys: KeyEvent[];
  focusedId?: string;
  elapsedTime: number;

  /**
   * The active semantic theme for this subtree. Tokens are callable fg
   * stylers that also carry `.rgb`/`.hex`, so they work as both text
   * wrappers (`ctx.text(ctx.theme.primary('hi'))`) and color values
   * (`bgColor: ctx.theme.surface`). Defaults to the built-in darkTheme.
   */
  readonly theme: Theme;
  /**
   * Swaps the active theme live and requests a rerender. Sparse inputs are
   * completed via createTheme() derivation.
   */
  setTheme(theme: Theme | ThemeInput): void;
  /**
   * Runs the callback with an overridden theme for that subtree only.
   * Partial inputs overlay the current theme; the previous theme is
   * restored afterwards.
   */
  themed(
    theme: Theme | ThemeInput,
    callback: (sub: BuntiContext) => void,
  ): BuntiContext;
  /** True if `name` was pressed (or auto-repeated) this frame. */
  keyPressed(name: string): boolean;
  /** True from a key's first press until its repeat stream expires. */
  isKeyHeld(name: string): boolean;

  text(str: string | number): BuntiContext;
  icon(name: string): string; // Pure string return for template literal safety
  blit(
    x: number,
    y: number,
    content: string,
    style?: Partial<Cell>,
  ): BuntiContext;
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    style: Partial<Cell>,
  ): BuntiContext;
  viewport(
    content: string,
    width: number,
    height: number,
    scrollY?: number,
  ): string;
  span(
    options: { color?: string | number | RGB | ((s: string) => string) },
    callback: (sub: BuntiContext) => void,
  ): string;
  box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void): string;
  layer(
    zIndexOrOptions: number | LayerOptions,
    callback: (sub: BuntiContext) => void,
  ): BuntiContext;
  layer(callback: (sub: BuntiContext) => void): BuntiContext;
  joinHorizontal(...blocks: string[]): string;
  joinVertical(...blocks: string[]): string;
  wallpaper(
    input:
      | string
      | number
      | RGB
      | ThemeColor
      | RGB[]
      | Gradient
      | { color: any },
  ): void;
  gradient(options: {
    colors: (string | number | RGB | ThemeColor)[];
    direction?: 'vertical' | 'horizontal';
    steps?: number;
  }): Gradient;
  rgb(r: number, g: number, b: number): RGB;

  // State & Focus
  useState<T>(initial: T): [T, (val: T) => void];
  useState<T>(key: string, initial: T): [T, (val: T) => void];
  usePersistentState<T>(key: string, initial: T): [T, (val: T) => void];
  focusable(id: string): boolean;
  isFocused(id: string): boolean;
  focus(id: string): void;
  focusNext(): void;
  hitbox(
    id: string,
    bounds: RectInput,
  ): {
    box: Hitbox;
    hovered: boolean;
    pressed: boolean;
    clicked: boolean;
  };
  resolveRect(bounds: RectInput): Rect;
  resolveLocalRect(bounds: PlacedRectInput, options?: PlacedRectOptions): Rect;
  split(options: SplitOptions): Rect[];
  isHovered(id: string): boolean;
  /** Mouse currently down inside the hitbox. */
  isPressed(id: string): boolean;
  /** True exactly one frame per click (SGR release at the press origin). */
  isClicked(id: string): boolean;
  /** Hover turned on for this hitbox this frame. */
  isHoverEnter(id: string): boolean;
  /** Hover turned off for this hitbox this frame. */
  isHoverLeave(id: string): boolean;

  list(id: string, items: string[], options?: ListOptions): BuntiContext;
  table(rows: string[][], options?: TableOptions): BuntiContext;

  // Animation
  animate(
    duration: number,
    options?: { loop?: boolean; delay?: number; id?: string },
  ): number;
  fade(
    from: string | number | RGB,
    to: string | number | RGB,
    progress: number,
  ): RGB;
  typewriter(text: string, options?: TypewriterOptions): TypewriterState;
  flicker(intensity?: number): boolean;

  // Async data
  useAsync<T>(
    fetcher: () => Promise<T>,
    options?: { interval?: number },
  ): {
    data: T | undefined;
    loading: boolean;
    error: Error | undefined;
  };
  useAsync<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { interval?: number },
  ): {
    data: T | undefined;
    loading: boolean;
    error: Error | undefined;
  };

  requestStop(): void;
  flushFlow(): void;
}

/**
 * The DSL state container allowing stable references with dynamic capture targets.
 */
export interface DSLState {
  activeContents: string[];
  stack: string[][];
  layers: RenderLayer[];
  layerOrder: number;
  /** Stack of subtree theme overrides pushed by ctx.themed(). */
  themeStack: Theme[];
}

export interface RenderLayer {
  zIndex: number;
  order: number;
  buffer: Cell[];
}
