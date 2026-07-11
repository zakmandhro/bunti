/**
 * Bunti Functional Screen State & Initialization
 */

import { type ColorTier, setColorTier } from './detect';
import type {
  HeldKeyTracker,
  InputTokenizer,
  KeyEvent,
  TerminalResponse,
} from './input';
import type { Theme, ThemeColor } from './theme';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Cell {
  char: string;
  fg?: string | number | RGB | ThemeColor;
  bg?: string | number | RGB | ThemeColor;
  bold?: boolean;
  fgCode?: string | number;
  bgCode?: string | number;
  skip?: boolean;
  raw?: boolean; // Bypasses automatic emoji-to-NF replacement
}

export interface Hitbox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenState {
  width: number;
  height: number;
  frontBuffer: Cell[];
  backBuffer: Cell[];
  mouseX: number;
  mouseY: number;
  mouseButton: number;
  isMouseDown: boolean;
  hasFocus: boolean;
  /** First non-modified key name of the current frame (back-compat). */
  lastKey?: string;
  /** KeyEvents accumulated between frames; drained each tick into keys. */
  keyQueue: KeyEvent[];
  /** This frame's KeyEvents (drained from keyQueue by the render loop). */
  keys: KeyEvent[];
  /** Terminal probe replies (cursor position, DA1/DA2, DECRQM, DCS).
   *  Consumers drain this array; it never feeds the key queue. */
  terminalResponses: TerminalResponse[];
  /** Press-origin of the click emitted this frame (undefined otherwise). */
  clickX?: number;
  clickY?: number;
  /** Press-origin of an in-flight left-button press (click emits here). */
  mouseDownX?: number;
  mouseDownY?: number;
  /** Hover state per hitbox id as of its last evaluation. */
  hoverStates: Map<string, boolean>;
  /** Hitbox ids whose hover turned on this frame. */
  hoverEntered: Set<string>;
  /** Hitbox ids whose hover turned off this frame. */
  hoverLeft: Set<string>;
  /** Lazily created by applyInputToState. */
  inputTokenizer?: InputTokenizer;
  /** Lazily created by the input dispatch; injectable for tests. */
  heldKeys?: HeldKeyTracker;
  focusedId?: string;
  focusableIds: string[];
  hitboxes: Map<string, Hitbox>;
  componentState: Map<string, any>;
  hookCounter?: number;
  startTime: number;
  lastFg?: any;
  lastBg?: any;
  lastBold?: boolean;
  needsFullRedraw?: boolean;
  id?: string;
  options: ScreenOptions;
  requestStop?: () => void;
  isStopped?: boolean;
  isRestored?: boolean;
  isResizing?: boolean;
  resizeSettlesAt?: number;
  /** Active semantic theme (swapped live via ctx.setTheme). */
  theme?: Theme;
}

export interface ScreenOptions {
  fps?: number;
  mouse?: boolean;
  focus?: boolean;
  keyboard?: boolean;
  alternateBuffer?: boolean;
  hideCursor?: boolean;
  nerdFont?: boolean;
  resizeDebounceMs?: number;
  /** Bare-ESC disambiguation window for the input tokenizer (default 30ms). */
  escTimeoutMs?: number;
  /** Held-key expiry window for ctx.isKeyHeld (default 150ms). */
  holdWindowMs?: number;
  defaultFg?: string | number | RGB | ThemeColor;
  /** Semantic theme exposed as ctx.theme (defaults to darkTheme). */
  theme?: Theme;
  /** Forces the color capability tier (otherwise detected from env). */
  colorTier?: ColorTier;
  /**
   * Called when the render callback throws during a frame.
   * Return `'continue'` to keep the loop alive (app-level error boundary);
   * any other return tears the screen down, restores the terminal, and
   * rejects the promise returned by render()/loop() with the error.
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only handlers assignable
  onError?: (err: unknown) => void | 'continue';
}

/**
 * Creates a fresh ScreenState based on the terminal dimensions and options.
 */
export function createScreenState(options: ScreenOptions = {}): ScreenState {
  if (options.colorTier !== undefined) setColorTier(options.colorTier);

  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  const size = width * height;

  const state: ScreenState = {
    width,
    height,
    frontBuffer: Array.from({ length: size }, () => ({
      char: '',
      fg: undefined,
      bg: undefined,
      fgCode: undefined,
      bgCode: undefined,
      skip: false,
    })),
    backBuffer: Array.from({ length: size }, () => ({
      char: ' ',
      fg: undefined,
      bg: undefined,
      fgCode: undefined,
      bgCode: undefined,
      skip: false,
    })),
    mouseX: 0,
    mouseY: 0,
    mouseButton: 0,
    isMouseDown: false,
    hasFocus: true,
    keyQueue: [],
    keys: [],
    terminalResponses: [],
    hoverStates: new Map(),
    hoverEntered: new Set(),
    hoverLeft: new Set(),
    focusableIds: [],
    hitboxes: new Map(),
    componentState: new Map(),
    startTime: Date.now(),
    options,
    theme: options.theme,
  };

  return state;
}

/**
 * Resizes the front/back buffers to match the new terminal size.
 */
export function resizeScreen(state: ScreenState) {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  const size = width * height;

  state.width = width;
  state.height = height;
  state.frontBuffer = Array.from({ length: size }, () => ({
    char: '',
    fg: undefined,
    bg: undefined,
    fgCode: undefined,
    bgCode: undefined,
    skip: false,
  }));
  state.backBuffer = Array.from({ length: size }, () => ({
    char: ' ',
    fg: undefined,
    bg: undefined,
    fgCode: undefined,
    bgCode: undefined,
    skip: false,
  }));
  state.lastFg = undefined;
  state.lastBg = undefined;
  state.lastBold = false;
  state.needsFullRedraw = true;
  state.isResizing = true;
  state.resizeSettlesAt = Date.now() + (state.options.resizeDebounceMs ?? 1);
}

/**
 * Clears the back buffer to the base wallpaper or a given cell style.
 */
export function clearBackBuffer(state: ScreenState) {
  for (let i = 0; i < state.backBuffer.length; i++) {
    const cell = state.backBuffer[i]!;
    cell.char = ' ';
    cell.fg = undefined;
    cell.bg = undefined;
    cell.fgCode = undefined;
    cell.bgCode = undefined;
    cell.bold = false;
    cell.skip = false;
  }
}

export const ANSI = {
  reset: '\x1b[0m',
  clear: '\x1b[2J',
  home: '\x1b[H',
  alternateBuffer: '\x1b[?1049h',
  mainBuffer: '\x1b[?1049l',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  mouseEnable: '\x1b[?1003h\x1b[?1006h',
  mouseDisable: '\x1b[?1003l\x1b[?1006l',
  focusEnable: '\x1b[?1004h',
  focusDisable: '\x1b[?1004l',
  syncStart: '\x1b[?2026h',
  syncEnd: '\x1b[?2026l',
};
