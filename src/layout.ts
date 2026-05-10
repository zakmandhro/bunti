/**
 * Bunti Functional Layout & Drawing
 * Strictly functional primitives for buffer manipulation and layout generation.
 */

import { ScreenState, Cell } from './state';
import { visibleWidth, charWidth, truncate } from './utils';

// --- Functional Primitives (Buffer Manipulation) ---

export function setCell(state: ScreenState, x: number, y: number, cell: Partial<Cell>) {
  if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
    const char = cell.char || ' ';
    const width = charWidth(char);
    if (width === 0) return;
    state.backBuffer[y][x] = { ...state.backBuffer[y][x], ...cell, char };
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

export function rect(state: ScreenState, x: number, y: number, w: number, h: number, cell: Partial<Cell>) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setCell(state, x + dx, y + dy, cell);
    }
  }
}

export function blit(state: ScreenState, startX: number, startY: number, content: string) {
  const lines = content.split('\n');
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    let x = startX;
    let currentFg: any, currentBg: any;
    const regex = /\x1B\[([0-9;]*)m|([^\x1B]+)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match[1] !== undefined) {
        const codes = match[1].split(';');
        for (let i = 0; i < codes.length; i++) {
          const code = parseInt(codes[i] || '0');
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

export type BorderStyle = 
  | 'small' | 'rounded' | 'medium' | 'large' | 'extra-large' | 'double'
  | 'dashed' | 'dotted' | 'classic' | 'none';

export interface StyleOptions {
  width?: number;
  height?: number;
  padding?: [number, number];
  border?: BorderStyle;
  borderColor?: (s: string) => string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

const BORDERS: Record<string, any> = {
  small: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  medium: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
  large: { tl: '▛', tr: '▜', bl: '▙', br: '▟', top: '▀', bottom: '▄', left: '▌', right: '▐' },
  'extra-large': { tl: '█', tr: '█', bl: '█', br: '█', h: '█', v: '█' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  dashed: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '╌', v: '╎' },
  dotted: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '┈', v: '┊' },
  classic: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
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
  
  const b = (options.border === 'none') ? null : (BORDERS[options.border as keyof typeof BORDERS] || BORDERS.rounded);
  const borderColor = options.borderColor || ((s: string) => s);

  const hTop = b?.top || b?.h || ' ';
  const hBottom = b?.bottom || b?.h || ' ';
  const vLeft = b?.left || b?.v || ' ';
  const vRight = b?.right || b?.v || ' ';

  const out = [];
  if (b) out.push(borderColor(b.tl + hTop.repeat(innerW) + b.tr));
  for (let i = 0; i < py; i++) {
    let row = b ? borderColor(vLeft) : '';
    row += ' '.repeat(innerW);
    if (b) row += borderColor(vRight);
    out.push(row);
  }
  for (const line of lines) {
    const lineW = visibleWidth(line);
    const extra = Math.max(0, innerW - lineW);
    let left = 0, right = 0;
    const align = options.align || 'center';
    if (align === 'center') { left = Math.floor(extra / 2); right = Math.ceil(extra / 2); }
    else if (align === 'right') { left = extra; right = 0; }
    else { left = px; right = extra - px; }
    let row = b ? borderColor(vLeft) : '';
    row += ' '.repeat(Math.max(0, left)) + line + ' '.repeat(Math.max(0, right));
    if (b) row += borderColor(vRight);
    out.push(row);
  }
  for (let i = 0; i < py; i++) {
    let row = b ? borderColor(vLeft) : '';
    row += ' '.repeat(innerW);
    if (b) row += borderColor(vRight);
    out.push(row);
  }
  if (b) out.push(borderColor(b.bl + hBottom.repeat(innerW) + b.br));
  return out.join('\n');
}

export function viewport(content: string, width: number, height: number, scrollY: number = 0): string {
  const lines = content.split('\n');
  const visibleLines = lines.slice(scrollY, scrollY + height);
  return visibleLines.map(line => truncate(line, width, '').padEnd(width, ' ')).join('\n');
}

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

export function wallpaper(state: ScreenState, cell: Partial<Cell>) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) setCell(state, x, y, cell);
  }
}
