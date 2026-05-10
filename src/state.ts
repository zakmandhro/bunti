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
}

export interface ScreenState {
  width: number;
  height: number;
  frontBuffer: Cell[][];
  backBuffer: Cell[][];
  mouseX: number;
  mouseY: number;
  mouseButton: number;
  isMouseDown: boolean;
  hasFocus: boolean;
  lastFg?: string | number;
  lastBg?: string | number;
  options: ScreenOptions;
}

export interface ScreenOptions {
  alternateBuffer?: boolean;
  hideCursor?: boolean;
  mouse?: boolean;
  focus?: boolean;
  fps?: number;
}

export const ANSI = {
  clear: '\x1b[2J\x1b[3J\x1b[H',
  home: '\x1b[H',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  reset: '\x1b[0m',
  alternateBuffer: '\x1b[?1049h',
  mainBuffer: '\x1b[?1049l',
  mouseEnable: '\x1b[?1000h\x1b[?1003h\x1b[?1015h\x1b[?1006h',
  mouseDisable: '\x1b[?1000l\x1b[?1003l\x1b[?1015l\x1b[?1006l',
  focusEnable: '\x1b[?1004h',
  focusDisable: '\x1b[?1004l',
};

/**
 * Creates a fresh ScreenState object.
 */
export function createScreenState(options: ScreenOptions = {}): ScreenState {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  const createBuffer = () => 
    Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ char: ' ', fg: undefined, bg: undefined }))
    );

  return {
    width,
    height,
    frontBuffer: createBuffer(),
    backBuffer: createBuffer(),
    mouseX: -1,
    mouseY: -1,
    mouseButton: -1,
    isMouseDown: false,
    hasFocus: true,
    options: {
      alternateBuffer: true,
      hideCursor: true,
      mouse: false,
      focus: true,
      fps: 60,
      ...options
    }
  };
}

/**
 * Updates the dimensions of the screen state and resizes buffers.
 */
export function resizeScreen(state: ScreenState) {
  state.width = process.stdout.columns || 80;
  state.height = process.stdout.rows || 24;

  const createBuffer = () => 
    Array.from({ length: state.height }, () =>
      Array.from({ length: state.width }, () => ({ char: ' ', fg: undefined, bg: undefined }))
    );

  state.frontBuffer = createBuffer();
  state.backBuffer = createBuffer();
}

/**
 * Clears the back buffer to a 'transparent' state.
 */
export function clearBackBuffer(state: ScreenState) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.backBuffer[y][x];
      cell.char = ' ';
      cell.fg = undefined;
      cell.bg = undefined;
    }
  }
}
