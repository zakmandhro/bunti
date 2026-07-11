/**
 * Bunti Functional Screen State & Initialization
 */

import {
  type ColorTier,
  identifyTerminal,
  setColorTier,
  type TerminalProfile,
} from './detect';
import type {
  HeldKeyTracker,
  InputTokenizer,
  KeyEvent,
  TerminalResponse,
} from './input';
import type { Theme, ThemeColor } from './theme';

/** 24-bit color triplet; each channel is 0-255. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * One terminal cell in the screen buffers. Drawing calls (blit/rect/setCell)
 * take Partial<Cell> as their style argument.
 */
export interface Cell {
  /** The glyph in this cell ('' marks a wide-glyph tail). */
  char: string;
  /** Foreground color: palette name, hex, ANSI-256 code, RGB, or theme token. */
  fg?: string | number | RGB | ThemeColor;
  /** Background color: palette name, hex, ANSI-256 code, RGB, or theme token. */
  bg?: string | number | RGB | ThemeColor;
  /** SGR bold. */
  bold?: boolean;
  /** Resolved fg ANSI code (set by setCell; do not set directly). */
  fgCode?: string | number;
  /** Resolved bg ANSI code (set by setCell; do not set directly). */
  bgCode?: string | number;
  /** Cell is a wide-glyph tail or transparent; the differ skips it. */
  skip?: boolean;
  /** Bypasses automatic emoji-to-Nerd-Font replacement. */
  raw?: boolean;
  // --- SGR text attributes ---
  /** SGR italic. */
  italic?: boolean;
  /** SGR underline. */
  underline?: boolean;
  /** SGR dim (faint). */
  dim?: boolean;
  /** SGR strikethrough. */
  strike?: boolean;
}

/** A named clickable region registered via ctx.hitbox() (absolute cells). */
export interface Hitbox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The mutable per-screen state behind a render() session: double buffers,
 * input queues, focus/hover bookkeeping, and component state. Exposed as
 * `ctx.state` for advanced use; most apps only need the BuntiContext API.
 */
export interface ScreenState {
  /** Terminal width in cells. */
  width: number;
  /** Terminal height in rows. */
  height: number;
  /** What is currently on the terminal (updated by flush). */
  frontBuffer: Cell[];
  /** The frame being drawn; diffed against frontBuffer on flush. */
  backBuffer: Cell[];
  /** Mouse column (0-based). */
  mouseX: number;
  /** Mouse row (0-based). */
  mouseY: number;
  /** Raw SGR button code of the most recent mouse event. */
  mouseButton: number;
  /** True while the left mouse button is held down. */
  isMouseDown: boolean;
  /** Terminal focus (drives the 5fps unfocused throttle). */
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
  /** Id of the currently focused focusable, if any. */
  focusedId?: string;
  /** Tab-cycle registration order (rebuilt each frame). */
  focusableIds: string[];
  /** Clickable regions registered this frame via ctx.hitbox(). */
  hitboxes: Map<string, Hitbox>;
  /** Backing store for useState/useAsync and motion/animation clocks. */
  componentState: Map<string, any>;
  /** Positional counter for keyless hooks (reset each frame). */
  hookCounter?: number;
  /** Epoch ms when render() started (ctx.elapsedTime = now - startTime). */
  startTime: number;
  /** Timestamp of the previous render tick (loop() owns this). */
  lastFrameAt?: number;
  /** Render tick counter (loop() owns this; exposed as ctx.frame). */
  frameCount?: number;
  /** Ms since the previous tick, clamped to 100 (exposed as ctx.dt). */
  dt?: number;
  /** SGR run-tracking across flushes (differ internals). */
  lastFg?: any;
  lastBg?: any;
  lastBold?: boolean;
  lastItalic?: boolean;
  lastUnderline?: boolean;
  lastDim?: boolean;
  lastStrike?: boolean;
  /** Last OSC 22 mouse-cursor shape emitted ('pointer' over hitboxes). */
  pointerShape?: 'default' | 'pointer';
  /** Forces the next flush to clear and repaint everything. */
  needsFullRedraw?: boolean;
  /** Optional screen identifier. */
  id?: string;
  /** The options render() was called with. */
  options: ScreenOptions;
  /** Stops the active render loop (what ctx.requestStop() calls). */
  requestStop?: () => void;
  /** True once the loop has been stopped. */
  isStopped?: boolean;
  /** True once the terminal has been restored (teardown ran). */
  isRestored?: boolean;
  /** True while a resize is settling (frames are skipped). */
  isResizing?: boolean;
  /** Epoch ms when the current resize debounce window ends. */
  resizeSettlesAt?: number;
  /** Active semantic theme (swapped live via ctx.setTheme). */
  theme?: Theme;
  /** Env-detected terminal profile (detected once per createScreenState). */
  terminal?: TerminalProfile;
  /**
   * Effective synchronized-output flag for this screen. False only when the
   * terminal was positively identified as lacking mode 2026 support;
   * unknown terminals keep the sync wrap (harmlessly ignored when
   * unsupported) to preserve pre-detection behavior.
   */
  syncOutput?: boolean;
}

/**
 * Options for render(). Interactive apps typically want
 * `{ keyboard: true, mouse: true, alternateBuffer: true, hideCursor: true }`.
 */
export interface ScreenOptions {
  /** Target frames per second (default 60; throttles to 5 when unfocused). */
  fps?: number;
  /** Enables SGR mouse tracking (hover/click/wheel, ctx.hitbox). */
  mouse?: boolean;
  /** Enables terminal focus-in/out tracking (drives the fps throttle). */
  focus?: boolean;
  /**
   * Enables keyboard input (raw-mode stdin -> ctx.lastKey / ctx.keys).
   * Requires a real TTY: piped stdin is ignored.
   */
  keyboard?: boolean;
  /** Renders on the alternate screen buffer and restores the shell on exit. */
  alternateBuffer?: boolean;
  /** Hides the terminal cursor while rendering (restored on exit). */
  hideCursor?: boolean;
  /** Forces the icon tier: true = Nerd Font glyphs, false = ASCII fallbacks. */
  nerdFont?: boolean;
  /** How long a resize must settle before repainting (default 1ms). */
  resizeDebounceMs?: number;
  /** Bare-ESC disambiguation window for the input tokenizer (default 30ms). */
  escTimeoutMs?: number;
  /** Held-key expiry window for ctx.isKeyHeld (default 150ms). */
  holdWindowMs?: number;
  /** Default text color for cells without an explicit fg. */
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

  const terminal = identifyTerminal();
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
    terminal,
    // Judgment call: unknown terminals keep today's always-sync behavior
    // (mode 2026 is ignored when unsupported); only positively identified
    // non-supporting terminals skip the wrap.
    syncOutput: terminal.app === 'unknown' ? true : terminal.syncOutput,
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
  state.lastItalic = false;
  state.lastUnderline = false;
  state.lastDim = false;
  state.lastStrike = false;
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
    cell.italic = false;
    cell.underline = false;
    cell.dim = false;
    cell.strike = false;
    cell.skip = false;
  }
}

/** Raw ANSI escape sequences used by the renderer (advanced use). */
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
