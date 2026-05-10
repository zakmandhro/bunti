/**
 * Bunti Functional Screen State & Initialization
 */

import { Gradient } from './colors';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Cell {
  char: string;
  fg?: string | number | RGB;
  bg?: string | number | RGB;
  raw?: boolean; // Bypasses automatic emoji-to-NF replacement
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
  lastKey?: string;
  focusedId?: string;
  focusableIds: string[];
  componentState: Map<string, any>;
  startTime: number;
  lastFg?: any;
  lastBg?: any;
  id?: string;
  options: ScreenOptions;
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

  const state: ScreenState = {
    width,
    height,
    frontBuffer: Array.from({ length: height }, () => 
      Array.from({ length: width }, () => ({ char: '', fg: undefined, bg: undefined }))
    ),
    backBuffer: Array.from({ length: height }, () => 
      Array.from({ length: width }, () => ({ char: ' ', fg: undefined, bg: undefined }))
    ),
    mouseX: 0,
    mouseY: 0,
    mouseButton: 0,
    isMouseDown: false,
    hasFocus: true,
    focusableIds: [],
    componentState: new Map(),
    startTime: Date.now(),
    options
  };

  return state;
}

/**
 * Resizes the front/back buffers to match the new terminal size.
 */
export function resizeScreen(state: ScreenState) {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  state.width = width;
  state.height = height;
  state.frontBuffer = Array.from({ length: height }, () => 
    Array.from({ length: width }, () => ({ char: '', fg: undefined, bg: undefined }))
  );
  state.backBuffer = Array.from({ length: height }, () => 
    Array.from({ length: width }, () => ({ char: ' ', fg: undefined, bg: undefined }))
  );
}

/**
 * Clears the back buffer to the base wallpaper or a given cell style.
 */
export function clearBackBuffer(state: ScreenState) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      state.backBuffer[y][x] = { char: ' ', fg: undefined, bg: undefined };
    }
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
};
