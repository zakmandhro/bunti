/**
 * Bunti Functional Layout & Drawing
 * Strictly functional primitives for buffer manipulation and layout generation.
 */

import { ScreenState, Cell } from './state';
import { visibleWidth, charWidth, truncate } from './utils';

// --- Functional Primitives (Buffer Manipulation) ---

/**
 * Sets a single cell in the back buffer with wide-character awareness.
 */
export function setCell(state: ScreenState, x: number, y: number, cell: Partial<Cell>) {
  if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
    const char = cell.char || ' ';
    const width = charWidth(char);
    
    if (width === 0) return;

    state.backBuffer[y][x] = { ...state.backBuffer[y][x], ...cell, char };

    // Handle wide characters by marking the next cell as a filler
    if (width === 2 && x + 1 < state.width) {
      state.backBuffer[y][x + 1] = { 
        ...state.backBuffer[y][x + 1], 
        char: '', 
        fg: cell.fg ?? state.backBuffer[y][x].fg, 
        bg: cell.bg ?? state.backBuffer[y][x].bg 
      };
    }
  }
}

/**
 * Fills a rectangular area with a specific cell style.
 */
export function rect(state: ScreenState, x: number, y: number, w: number, h: number, cell: Partial<Cell>) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setCell(state, x + dx, y + dy, cell);
    }
  }
}

/**
 * Paints an ANSI-styled string into the buffer, preserving background transparency.
 */
export function blit(state: ScreenState, startX: number, startY: number, content: string) {
  const lines = content.split('\n');
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    let x = startX;
    let currentFg: any, currentBg: any;
    
    // Regex for ANSI SGR codes
    const regex = /\x1b\[([\d;]+)m|([^\x1b]+)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match[1]) {
        const codes = match[1].split(';');
        for (let i = 0; i < codes.length; i++) {
          const code = parseInt(codes[i]);
          if (code === 0) { currentFg = undefined; currentBg = undefined; }
          else if (code >= 30 && code <= 37) currentFg = (code - 30).toString();
          else if (code >= 40 && code <= 47) currentBg = (code - 40).toString();
          else if (code >= 90 && code <= 97) currentFg = (code - 90 + 8).toString();
          else if (code >= 100 && code <= 107) currentBg = (code - 100 + 8).toString();
          else if (code === 38 && codes[i + 1] === '5') { currentFg = codes[i + 2]; i += 2; }
          else if (code === 38 && codes[i + 1] === '2') { currentFg = { r: parseInt(codes[i + 2]), g: parseInt(codes[i + 3]), b: parseInt(codes[i + 4]) }; i += 4; }
          else if (code === 48 && codes[i + 1] === '5') { currentBg = codes[i + 2]; i += 2; }
          else if (code === 48 && codes[i + 1] === '2') { currentBg = { r: parseInt(codes[i + 2]), g: parseInt(codes[i + 3]), b: parseInt(codes[i + 4]) }; i += 4; }
          else if (code === 39) currentFg = undefined;
          else if (code === 49) currentBg = undefined;
        }
      } else if (match[2]) {
        const chars = Array.from(match[2]);
        for (const char of chars) {
          const w = charWidth(char);
          if (w === 0) continue;
          
          const cell: Partial<Cell> = { char };
          if (currentFg !== undefined) cell.fg = currentFg;
          if (currentBg !== undefined) cell.bg = currentBg;
          
          setCell(state, x, startY + row, cell);
          x += w;
        }
      }
    }
  }
}

// --- High-Level Layout ---

export interface StyleOptions {
  width?: number;
  height?: number;
  padding?: [number, number];
  border?: 'normal' | 'rounded' | 'none';
  borderColor?: (s: string) => string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

const BORDERS = {
  normal: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
};

/**
 * Generates a styled box string with perfect alignment and padding.
 */
export function box(content: string, options: StyleOptions = {}): string {
  const px = options.padding?.[1] ?? 3;
  const py = options.padding?.[0] ?? 1;
  const lines = content.split('\n');

  const maxContentW = Math.max(...lines.map(visibleWidth), 0);
  const borderOffset = (options.border === 'none') ? 0 : 2;
  const innerW = options.width ? (options.width - borderOffset) : (maxContentW + (px * 2));
  
  const border = options.border === 'none' ? null : (BORDERS[options.border as keyof typeof BORDERS] || BORDERS.rounded);
  const borderColor = options.borderColor || ((s: string) => s);

  const out = [];
  
  // Top Border
  if (border) out.push(borderColor(border.tl + border.h.repeat(innerW) + border.tr));
  
  // Top Padding
  for (let i = 0; i < py; i++) {
    let row = border ? borderColor(border.v) : '';
    row += ' '.repeat(innerW);
    if (border) row += borderColor(border.v);
    out.push(row);
  }

  // Content Lines
  for (const line of lines) {
    const lineW = visibleWidth(line);
    const extra = Math.max(0, innerW - lineW);
    
    let left = 0, right = 0;
    if (options.align === 'center') {
      left = Math.floor(extra / 2);
      right = Math.ceil(extra / 2);
    } else if (options.align === 'right') {
      left = extra;
      right = 0;
    } else {
      left = px;
      right = extra - px;
    }

    let row = border ? borderColor(border.v) : '';
    row += ' '.repeat(left) + line + ' '.repeat(right);
    if (border) row += borderColor(border.v);
    out.push(row);
  }

  // Bottom Padding
  for (let i = 0; i < py; i++) {
    let row = border ? borderColor(border.v) : '';
    row += ' '.repeat(innerW);
    if (border) row += borderColor(border.v);
    out.push(row);
  }

  // Bottom Border
  if (border) out.push(borderColor(border.bl + border.h.repeat(innerW) + border.br));

  return out.join('\n');
}

/**
 * Fills the screen with a high-fidelity gradient.
 */
export function gradient(state: ScreenState, colors: (string | number | any)[], options: { direction?: 'vertical' | 'horizontal', offset?: number } = {}) {
  const direction = options.direction || 'vertical';
  const offset = options.offset || 0;
  
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const ratio = direction === 'vertical' ? (y / state.height) : (x / state.width);
      const idx = Math.floor((ratio * colors.length) + offset) % colors.length;
      setCell(state, x, y, { char: ' ', bg: colors[idx] });
    }
  }
}

/**
 * Fills the entire screen with a specific cell style or pattern.
 */
export function wallpaper(state: ScreenState, cell: Partial<Cell>) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      setCell(state, x, y, cell);
    }
  }
}
