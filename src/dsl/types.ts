/**
 * Bunti DSL shared types and constants.
 */

import type { bg, darken, fg, Gradient, lighten, rgb } from '../colors';
import type { TerminalProfile } from '../detect';
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

/**
 * Normalized key-name constants for `ctx.lastKey` / `ctx.keyPressed()`.
 * Printable keys are their literal character ('a', 'A', ' '); mouse events
 * arrive as the 'click' / 'wheel_up' / 'wheel_down' pseudo-keys.
 * @example if (ctx.keyPressed(KEYS.ENTER)) submit();
 */
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

/**
 * Options for `ctx.box()`. Extends StyleOptions (width/height/padding/
 * border/align/wrap) with placement, layering, and color controls.
 */
export interface DSLBoxOptions extends StyleOptions {
  /** Background fill: palette name, hex, ANSI-256 code, RGB, Gradient, or theme token. */
  bgColor?: string | number | RGB | Gradient | ThemeColor;
  /**
   * Default text color inside the box. 'blank' auto-picks black or white
   * for WCAG contrast against `bgColor`.
   */
  color?: string | number | RGB | ThemeColor | 'blank';
  /** Column offset (cells) inside the parent area. Unplaced boxes center. */
  x?: number;
  /** Row offset (cells) inside the parent area. Unplaced boxes center. */
  y?: number;
  /**
   * Promotes the box onto its own composited layer at this z-index —
   * shorthand for wrapping it in `ctx.layer(zIndex, ...)`.
   */
  zIndex?: number;
  /** Pins the box to the top or bottom edge at full parent width. */
  anchor?: 'top' | 'bottom';
  /** Reserved size hint ('auto' sizes to content). */
  size?: 'auto' | number;
  /** Title rendered into the top border. */
  title?: string;
  /** Styler applied to the rendered title (e.g. a ThemeColor or color.bold). */
  titleStyle?: (s: string) => string;
  /** Stable identifier (useful with hitboxes/focus). */
  id?: string;
  /**
   * Border color: single color value, a styler function, or per-side
   * colors ({ top, bottom, left, right }).
   */
  borderColor?:
    | string
    | number
    | RGB
    | ThemeColor
    | ((s: string) => string)
    | SideColors;
  /** If true, the string is returned but NOT appended to the flow. */
  detach?: boolean;
}

/** Options for `ctx.typewriter()`. */
export interface TypewriterOptions {
  /** Keys the animation clock (restartable via `ctx.restartAnimation(id)`). */
  id?: string;
  /** Typing speed in characters per second (default 24). */
  cps?: number;
  /** Milliseconds to wait before typing starts. */
  delay?: number;
  /** Restart from the beginning after the full text is typed. */
  loop?: boolean;
  /** Cursor glyph (default '█'). */
  cursor?: string;
  /** Set false to disable cursor blinking after typing completes. */
  blink?: boolean;
  /** Cursor blink period in milliseconds (default 450). */
  blinkRate?: number;
}

/** Frame snapshot returned by `ctx.typewriter()`. */
export interface TypewriterState {
  /** The portion of the text typed so far. */
  text: string;
  /** The cursor glyph for this frame (' ' during blink-off phases). */
  cursor: string;
  /** True once the full text has been typed. */
  done: boolean;
  /** Number of graphemes typed so far. */
  index: number;
  /** Typing progress 0..1. */
  progress: number;
}

/** Options for `ctx.layer()`. */
export interface LayerOptions {
  /** Composite order: higher z-index layers paint on top (default 0). */
  zIndex?: number;
  /**
   * Paints a drop shadow under the layer's painted content bounds
   * (offset +2 columns, +1 row) at composite time. The shadow darkens
   * whatever sits below it, including lower layers.
   */
  shadow?: boolean;
  /**
   * Dims everything below this layer by 0..1 (backdrop luminance scale
   * toward black) before the layer composites. Applied in z-order, so
   * lower layers are dimmed too.
   */
  backdrop?: number;
}

/**
 * The contextual builder passed to every render closure. One frame = one
 * callback invocation: read input, derive state, draw.
 *
 * Coordinate model: `x`/`y` are cell offsets local to the current context
 * area (the whole screen at the root; the padded interior inside a box).
 * At the root, `box()` paints straight into the screen buffer and centers
 * when not given `x`/`y`; inside a box, drawing calls append to that box's
 * text flow. Use `layer()`/`zIndex` for anything that must overlap.
 */
export interface BuntiContext {
  /**
   * ANSI color helpers: picocolors-style stylers (`color.bold`,
   * `color.cyan`, ...) plus Bunti's RGB helpers (`color.fg(value, text)`,
   * `color.bg`, `color.rgb`, `color.darken`, `color.lighten`).
   */
  color: BuntiColor & {
    darken: typeof darken;
    lighten: typeof lighten;
    rgb: typeof rgb;
    fg: typeof fg;
    bg: typeof bg;
  };
  /** The underlying screen state (buffers, options, input). Advanced use. */
  state: ScreenState;
  /** Width of the current context area in cells. */
  width: number;
  /** Height of the current context area in cells (rows). */
  height: number;
  /** The current context area as an absolute Rect. */
  area: Rect;
  /** True on the top-level screen context (false inside box/layer closures). */
  isRoot: boolean;
  /** Absolute column of this context's origin (for `blit`/`rect` math). */
  offsetX: number;
  /** Absolute row of this context's origin (for `blit`/`rect` math). */
  offsetY: number;
  /** Column the text flow ends at on its last line (local). */
  readonly cursorX: number;
  /** Row the text flow ends at (local) — where the next text/box lands. */
  readonly cursorY: number;
  /** Mouse column (0-based screen cells; requires `mouse: true`). */
  mouseX: number;
  /** Mouse row (0-based screen cells; requires `mouse: true`). */
  mouseY: number;
  /** Raw SGR button code of the most recent mouse event. */
  mouseButton: number;
  /** True while the left mouse button is held down. */
  isMouseDown: boolean;
  /**
   * First unmodified key name of this frame, or undefined when no key
   * arrived. Printable keys are the literal character ('a', ' '); special
   * keys are normalized lowercase names ('up', 'enter', 'escape', 'f1');
   * mouse events arrive as 'click' / 'wheel_up' / 'wheel_down'. Requires
   * `keyboard: true` in the render options.
   * @example if (ctx.lastKey === 'q') ctx.requestStop();
   */
  lastKey?: string;
  /**
   * All KeyEvents of this frame (multiple keys per frame arrive whole),
   * including ctrl/alt combos and synthetic 'release' events that
   * `lastKey` never carries. Requires `keyboard: true`.
   * @example for (const e of ctx.keys) if (e.key === 'enter') submit();
   */
  keys: KeyEvent[];
  /** Id of the currently focused focusable, if any. */
  focusedId?: string;
  /**
   * Milliseconds elapsed since render() started. Drives time-based
   * animation (fps-independent).
   * @example const pulse = Math.sin(ctx.elapsedTime / 300);
   */
  elapsedTime: number;

  /**
   * The env-detected terminal profile (app, version, multiplexer, truecolor,
   * sync output, Nerd Font policy). Detected once per render().
   */
  readonly terminal: TerminalProfile;

  /**
   * The active semantic theme for this subtree. Tokens are callable fg
   * stylers that also carry `.rgb`/`.hex`, so they work as both text
   * wrappers and color values.
   * @example ctx.box({ bgColor: ctx.theme.surface }, (s) => s.text(ctx.theme.primary('hi')));
   */
  readonly theme: Theme;
  /**
   * Swaps the active theme live and requests a rerender. Sparse inputs are
   * completed via createTheme() derivation.
   * @example ctx.setTheme(dracula); // from '@zakmandhro/bunti/themes'
   */
  setTheme(theme: Theme | ThemeInput): void;
  /**
   * Runs the callback with an overridden theme for that subtree only.
   * Partial inputs overlay the current theme; the previous theme is
   * restored afterwards.
   * @example ctx.themed({ primary: '#ff5f87' }, (sub) => sidebar(sub));
   */
  themed(
    theme: Theme | ThemeInput,
    callback: (sub: BuntiContext) => void,
  ): BuntiContext;
  /**
   * True if `name` was pressed (or auto-repeated) this frame. Requires
   * `keyboard: true`.
   * @example if (ctx.keyPressed('escape')) closeModal();
   */
  keyPressed(name: string): boolean;
  /**
   * True from a key's first press until its repeat stream expires
   * (~150ms hold window) — smooth held-key movement on legacy terminals.
   * @example if (ctx.isKeyHeld('right')) player.x += speed * ctx.dt;
   */
  isKeyHeld(name: string): boolean;

  /**
   * Appends text to the current flow at the cursor. Supports '\n' and
   * pre-styled ANSI strings; returns the context for chaining.
   * @example ctx.text(ctx.color.bold('Status: ')).text('ready\n');
   */
  text(str: string | number): BuntiContext;
  /**
   * Resolves an icon name to its glyph (Nerd Font, or ASCII fallback on
   * plain terminals). Pure string return for template-literal safety.
   * Curated names work out of the box; `import '@zakmandhro/bunti/icons-full'`
   * unlocks all ~10.7k Nerd Font names.
   * @example ctx.text(`${ctx.icon('rocket')} Launch`);
   */
  icon(name: string): string;
  /**
   * Paints a (possibly multi-line, ANSI-styled) string directly into the
   * screen buffer at absolute cell coordinates — exact-position text,
   * sprites, labels, and ASCII art.
   * @example ctx.blit(2, 1, 'FPS 60', { fg: 'gold' });
   */
  blit(
    x: number,
    y: number,
    content: string,
    style?: Partial<Cell>,
  ): BuntiContext;
  /**
   * Fills a w×h cell rectangle at absolute coordinates with a style —
   * bars, panels, charts, and backgrounds. Pure-background fills keep the
   * characters already painted underneath.
   * @example ctx.rect(0, 0, ctx.width, 3, { bg: ctx.theme.surface });
   */
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    style: Partial<Cell>,
  ): BuntiContext;
  /**
   * Crops a multi-line string to a width×height window starting at
   * `scrollY` — the primitive for scrollable content.
   */
  viewport(
    content: string,
    width: number,
    height: number,
    scrollY?: number,
  ): string;
  /**
   * Runs the callback, wraps everything it appended in one color, and
   * pushes the styled result to the flow. Returns the styled string.
   */
  span(
    options: { color?: string | number | RGB | ((s: string) => string) },
    callback: (sub: BuntiContext) => void,
  ): string;
  /**
   * Draws a styled box and renders the callback inside its padded
   * interior (a fresh sub-context). At the root, boxes paint directly to
   * the screen and center unless given x/y; nested boxes join the parent
   * flow. Returns the rendered string.
   * @example ctx.box({ width: 40, border: 'rounded', title: 'Log' }, (s) => s.text('...'));
   */
  box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void): string;
  /**
   * Renders the callback into a transparent buffer composited above the
   * base content by z-index — THE primitive for modals, HUDs, popovers,
   * and anything that must overlap other content.
   * @example ctx.layer(10, (overlay) => overlay.box({ width: 30, height: 5 }, drawModal));
   */
  layer(
    zIndexOrOptions: number | LayerOptions,
    callback: (sub: BuntiContext) => void,
  ): BuntiContext;
  layer(callback: (sub: BuntiContext) => void): BuntiContext;
  /** Joins rendered blocks side-by-side, padding each to its own width. */
  joinHorizontal(...blocks: string[]): string;
  /** Stacks rendered blocks vertically (skips empty strings). */
  joinVertical(...blocks: string[]): string;
  /**
   * Fills the whole screen background with a color or gradient.
   * @example ctx.wallpaper(ctx.gradient({ colors: ['midnight', 'plasma'] }));
   */
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
  /**
   * Builds a multi-stop Gradient value for `wallpaper`/`bgColor`.
   * @example ctx.gradient({ colors: ['#0000ff', '#ff0000'], direction: 'horizontal' });
   */
  gradient(options: {
    colors: (string | number | RGB | ThemeColor)[];
    direction?: 'vertical' | 'horizontal';
    steps?: number;
  }): Gradient;
  /** Builds an RGB color value for truecolor rendering. */
  rgb(r: number, g: number, b: number): RGB;

  // State & Focus
  /**
   * Frame-persistent state. The keyed form is position-independent; the
   * keyless form is positional (React-style) and must not be called
   * conditionally. Setting a value requests a rerender.
   * @example const [count, setCount] = ctx.useState('count', 0);
   */
  useState<T>(initial: T): [T, (val: T) => void];
  useState<T>(key: string, initial: T): [T, (val: T) => void];
  /**
   * Like useState, but the value also persists across app restarts
   * (stored in .tmp/bunti_store.json).
   */
  usePersistentState<T>(key: string, initial: T): [T, (val: T) => void];
  /**
   * Registers `id` in the Tab-focus cycle and returns true while it is
   * focused. The first registered focusable receives initial focus.
   */
  focusable(id: string): boolean;
  /** True while `id` holds focus. */
  isFocused(id: string): boolean;
  /** Moves focus to `id`. */
  focus(id: string): void;
  /** Advances focus to the next registered focusable (what Tab does). */
  focusNext(): void;
  /**
   * Registers a clickable region and returns its interaction snapshot for
   * this frame. Requires `mouse: true`.
   * @example const { hovered, clicked } = ctx.hitbox('save', { x: 2, y: 5, width: 10, height: 1 });
   */
  hitbox(
    id: string,
    bounds: RectInput,
  ): {
    box: Hitbox;
    hovered: boolean;
    pressed: boolean;
    clicked: boolean;
  };
  /**
   * Resolves a partial rect (percent/fr sizes allowed) against the current
   * context area into absolute cells. `y` defaults to the flow cursor.
   */
  resolveRect(bounds: RectInput): Rect;
  /**
   * Places a rect within the current area with alignment defaults
   * (centered unless overridden) — the same placement `box()` uses.
   */
  resolveLocalRect(bounds: PlacedRectInput, options?: PlacedRectOptions): Rect;
  /**
   * Splits the current area into tracks from fixed sizes, percentages,
   * and 'fr' fill units — the layout workhorse for dashboards.
   * @example const [sidebar, main] = ctx.split({ direction: 'horizontal', constraints: [24, '1fr'] });
   */
  split(options: SplitOptions): Rect[];
  /**
   * True while the mouse is inside the hitbox registered for `id`.
   * @example const border = ctx.isHovered('card') ? theme.focus : theme.border;
   */
  isHovered(id: string): boolean;
  /** Mouse currently down inside the hitbox. */
  isPressed(id: string): boolean;
  /**
   * True exactly one frame per click (SGR release at the press origin) —
   * fire actions here, not on isPressed.
   * @example if (ctx.isClicked('save')) save();
   */
  isClicked(id: string): boolean;
  /** Hover turned on for this hitbox this frame. */
  isHoverEnter(id: string): boolean;
  /** Hover turned off for this hitbox this frame. */
  isHoverLeave(id: string): boolean;

  /**
   * Renders a selectable list with built-in up/down keyboard navigation,
   * mouse hover/click selection, and theme-token highlighting. Selection
   * state lives in `useState(`${id}_index`)`.
   * @example ctx.list('menu', ['Start', 'Options', 'Quit'], { maxVisible: 5 });
   */
  list(id: string, items: string[], options?: ListOptions): BuntiContext;
  /**
   * Renders rows of cells as an aligned table with shared borders.
   * @example ctx.table([['NAME', 'STATUS'], ['api', 'ready']], { width: '100%' });
   */
  table(rows: string[][], options?: TableOptions): BuntiContext;

  // Animation
  /**
   * 0→1 progress over `duration` ms. loop: true wraps, 'yoyo' bounces
   * 0→1→0. Pass `id` for a restartable clock (restartAnimation).
   * @example const t = ctx.animate(800, { loop: 'yoyo', easing: easeInOutCubic });
   */
  animate(
    duration: number,
    options?: {
      loop?: boolean | 'yoyo';
      delay?: number;
      id?: string;
      easing?: (t: number) => number;
    },
  ): number;
  /** Interpolates between two colors at `progress` 0..1, returning RGB. */
  fade(
    from: string | number | RGB,
    to: string | number | RGB,
    progress: number,
  ): RGB;
  /** Types `text` out over time with a blinking block cursor. */
  typewriter(text: string, options?: TypewriterOptions): TypewriterState;
  /** Deterministic time-bucketed flicker (fps-independent). */
  flicker(
    intensity?: number,
    options?: { id?: string; interval?: number },
  ): boolean;

  // Async data
  /**
   * Fetches async data without blocking the render loop: kicks off the
   * fetcher (re-running every `interval` ms when set) and returns the
   * latest { data, loading, error } snapshot each frame. Prefer the keyed
   * form; the keyless form is positional.
   * @example const { data, loading } = ctx.useAsync('stats', fetchStats, { interval: 5000 });
   */
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

  /**
   * Stops the render loop and restores the terminal (the promise returned
   * by render() then resolves). Also triggered by Ctrl+C.
   * @example if (ctx.lastKey === 'q') ctx.requestStop();
   */
  requestStop(): void;
  /** Flushes the pending flow to the buffer (called by render(); rare). */
  flushFlow(): void;

  // --- motion & text attrs ---
  /** Milliseconds since the previous frame, clamped to 100 (0 outside loop()). */
  readonly dt: number;
  /** Frame counter, incremented once per render tick (0 outside loop()). */
  readonly frame: number;
  /**
   * Enter/exit progress keyed on a visibility flag. progress runs 0→1
   * (eased) when `visible` turns on and 1→0 when it turns off; `mounted`
   * stays true through the exit so callers keep rendering while animating
   * out. THE primitive for modal/panel entrances and exits.
   * @example const { progress, mounted } = ctx.transition('panel', open, { duration: 200 });
   */
  transition(
    id: string,
    visible: boolean,
    options?: {
      duration?: number;
      easing?: (t: number) => number;
      exitDuration?: number;
    },
  ): { progress: number; mounted: boolean };
  /**
   * Cascading entrance progress: item `index` starts index*delay ms into
   * the timeline and animates for `duration` ms. Pass `id` to drive it from
   * an animate()-style clock (restartable via restartAnimation).
   * @example rows.forEach((row, i) => draw(row, ctx.stagger(i, { delay: 60, duration: 240 })));
   */
  stagger(
    index: number,
    options: {
      delay: number;
      duration: number;
      easing?: (t: number) => number;
      id?: string;
    },
  ): number;
  /** Resets an animate()/typewriter()/stagger() id clock to "now". */
  restartAnimation(id: string): void;
}

/**
 * The DSL state container allowing stable references with dynamic capture targets.
 */
export interface DSLState {
  /** Text-flow fragments accumulated for the active capture target. */
  activeContents: string[];
  /** Saved capture targets for nested box/span closures. */
  stack: string[][];
  /** Layers queued this frame, composited by flushFlow. */
  layers: RenderLayer[];
  /** Monotonic tiebreaker so equal z-indexes keep declaration order. */
  layerOrder: number;
  /** Stack of subtree theme overrides pushed by ctx.themed(). */
  themeStack: Theme[];
}

/** One queued overlay buffer awaiting composite (see ctx.layer()). */
export interface RenderLayer {
  /** Composite order: higher paints later (on top). */
  zIndex: number;
  /** Declaration-order tiebreaker for equal z-indexes. */
  order: number;
  /** The layer's transparent cell buffer. */
  buffer: Cell[];
  /** Composite-time drop shadow under the painted bounds. */
  shadow?: boolean;
  /** Composite-time whole-screen dim (0..1) below this layer. */
  backdrop?: number;
  /** Tight bounds of the layer's painted cells (null when empty). */
  bounds: Rect | null;
}
