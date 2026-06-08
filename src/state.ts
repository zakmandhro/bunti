/**
 * Bunti Functional Screen State & Initialization
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Cell {
  char: string;
  fg?: string | number | RGB;
  bg?: string | number | RGB;
  bold?: boolean;
  fgCode?: string | number;
  bgCode?: string | number;
  raw?: boolean; // Bypasses automatic emoji-to-NF replacement
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
  lastKey?: string;
  focusedId?: string;
  focusableIds: string[];
  componentState: Map<string, any>;
  startTime: number;
  lastFg?: any;
  lastBg?: any;
  lastBold?: boolean;
  id?: string;
  options: ScreenOptions;
  requestStop?: () => void;
}

export interface ScreenOptions {
  fps?: number;
  mouse?: boolean;
  focus?: boolean;
  keyboard?: boolean;
  alternateBuffer?: boolean;
  hideCursor?: boolean;
  nerdFont?: boolean;
}

/**
 * Creates a fresh ScreenState based on the terminal dimensions and options.
 */
export function createScreenState(options: ScreenOptions = {}): ScreenState {
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
    })),
    backBuffer: Array.from({ length: size }, () => ({
      char: ' ',
      fg: undefined,
      bg: undefined,
      fgCode: undefined,
      bgCode: undefined,
    })),
    mouseX: 0,
    mouseY: 0,
    mouseButton: 0,
    isMouseDown: false,
    hasFocus: true,
    focusableIds: [],
    componentState: new Map(),
    startTime: Date.now(),
    options,
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
  }));
  state.backBuffer = Array.from({ length: size }, () => ({
    char: ' ',
    fg: undefined,
    bg: undefined,
    fgCode: undefined,
    bgCode: undefined,
  }));
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
