/**
 * Bunti Functional Layout & Drawing
 * Strictly functional primitives for buffer manipulation and layout generation.
 */

import { ScreenState, Cell } from './state';
import { visibleWidth, charWidth, truncate, wrapText } from './utils';
import { replaceEmojis } from './icons';

// --- Functional Primitives (Buffer Manipulation) ---

export function setCell(state: ScreenState, x: number, y: number, cell: Partial<Cell>) {
  if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
    let char = cell.char || ' ';
    if (!cell.raw) char = replaceEmojis(char);
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

export function blit(state: ScreenState, startX: number, startY: number, content: string, style: Partial<Cell> = {}) {
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
          const cell: Partial<Cell> = { char, ...style };
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
  minWidth?: number;
  maxWidth?: number;
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: [number, number];
  border?: BorderStyle;
  borderColor?: (s: string) => string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
}

const BORDERS: Record<string, any> = {
  small: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  medium: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
  large: { tl: '█', tr: '█', bl: '█', br: '█', top: '▀', bottom: '▄', left: '█', right: '█' },
  'extra-large': { tl: '█', tr: '█', bl: '█', br: '█', h: '█', v: '█' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  dashed: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '╌', v: '╎' },
  dotted: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '┈', v: '┊' },
  classic: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
};

/**
 * Generates a styled box string with perfect alignment and optional wrapping.
 */
export function box(content: string, options: StyleOptions = {}): string {
  const px = options.padding?.[1] ?? 3;
  const py = options.padding?.[0] ?? 1;
  const borderOffset = (options.border === 'none') ? 0 : 2;

  // 1. Initial Width Calculation
  let targetInnerW = 0;
  if (options.width) {
    targetInnerW = Math.max(0, options.width - borderOffset);
  } else {
    const rawLines = content.split('\n');
    targetInnerW = Math.max(...rawLines.map(l => visibleWidth(replaceEmojis(l))), 0) + (px * 2);
  }

  // Apply Min/Max Width constraints
  if (options.minWidth) targetInnerW = Math.max(targetInnerW, options.minWidth - borderOffset);
  if (options.maxWidth) targetInnerW = Math.min(targetInnerW, options.maxWidth - borderOffset);

  // 2. Wrap or Truncate content
  let lines: string[] = [];
  if (options.wrap) {
    lines = wrapText(content, targetInnerW);
  } else {
    lines = content.split('\n').map(l => truncate(l, targetInnerW, ''));
  }

  // 3. Final Height Calculation
  const contentH = lines.length + (py * 2);
  let finalInnerH = options.height ? (options.height - borderOffset) : contentH;
  
  if (options.minHeight) finalInnerH = Math.max(finalInnerH, options.minHeight - borderOffset);
  if (options.maxHeight) finalInnerH = Math.min(finalInnerH, options.maxHeight - borderOffset);

  const b = (options.border === 'none') ? null : (BORDERS[options.border as keyof typeof BORDERS] || BORDERS.large);
  const borderColor = options.borderColor || ((s: string) => s);

  const hTop = b?.top || b?.h || ' ';
  const hBottom = b?.bottom || b?.h || ' ';
  const vLeft = b?.left || b?.v || ' ';
  const vRight = b?.right || b?.v || ' ';

  const vSpace = Math.max(0, finalInnerH - lines.length - (py * 2));
  let topS = 0, bottomS = vSpace;
  if (options.valign === 'middle') { topS = Math.floor(vSpace / 2); bottomS = Math.ceil(vSpace / 2); }
  else if (options.valign === 'bottom') { topS = vSpace; bottomS = 0; }

  const out = [];
  
  // Top Border
  if (b) out.push(borderColor(b.tl + hTop.repeat(targetInnerW) + b.tr));
  
  // Top Padding
  for (let i = 0; i < py + topS; i++) {
    let row = b ? borderColor(vLeft) : '';
    row += ' '.repeat(targetInnerW);
    if (b) row += borderColor(vRight);
    out.push(row);
  }

  // Content Lines
  for (const line of lines) {
    const lineW = visibleWidth(line);
    const extra = Math.max(0, targetInnerW - lineW);
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

  // Bottom Padding
  for (let i = 0; i < py + bottomS; i++) {
    let row = b ? borderColor(vLeft) : '';
    row += ' '.repeat(targetInnerW);
    if (b) row += borderColor(vRight);
    out.push(row);
  }

  // Bottom Border
  if (b) out.push(borderColor(b.bl + hBottom.repeat(targetInnerW) + b.br));

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

export function joinHorizontal(...blocks: string[]): string {
  if (blocks.length === 0) return '';
  const parsed = blocks.map(b => b.split('\n'));
  const maxH = Math.max(...parsed.map(b => b.length));
  const widths = parsed.map(b => Math.max(...b.map(visibleWidth), 0));
  let out = [];
  for (let i = 0; i < maxH; i++) {
    let row = '';
    for (let j = 0; j < parsed.length; j++) {
      const block = parsed[j]!;
      const targetW = widths[j]!;
      if (parsed[j][i] !== undefined) {
        row += parsed[j][i]! + ' '.repeat(Math.max(0, targetW - visibleWidth(parsed[j][i]!)));
      } else { row += ' '.repeat(targetW); }
    }
    out.push(row);
  }
  return out.join('\n');
}

export function joinVertical(...blocks: string[]): string {
  return blocks.filter(Boolean).join('\n');
}

export function createStyle(defaults: StyleOptions) {
  return (content: string, overrides: StyleOptions = {}) => {
    return box(content, { ...defaults, ...overrides });
  };
}

export function badge(text: string, colorFn: (s: string) => string = (s) => s): string {
  return colorFn(` ${text.toUpperCase()} `);
}

export function getWindow<T>(items: T[], selectedIndex: number, maxVisible: number) {
  const start = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), items.length - maxVisible));
  const visible = items.slice(start, start + maxVisible);
  return { visible, start, hasMoreAbove: start > 0, hasMoreBelow: start + maxVisible < items.length };
}

export interface ListOptions {
  bullet?: string;
  indent?: number;
  focusedIndex?: number;
  focusStyle?: (s: string) => string;
  maxVisible?: number;
}

export function list(items: string[], options: ListOptions = {}): string {
  const bullet = options.bullet || '';
  const indent = ' '.repeat(options.indent || 0);
  let targetItems = items, offset = 0, hasMoreAbove = false, hasMoreBelow = false;
  if (options.maxVisible && items.length > options.maxVisible) {
    const win = getWindow(items, options.focusedIndex || 0, options.maxVisible);
    targetItems = win.visible; offset = win.start; hasMoreAbove = win.hasMoreAbove; hasMoreBelow = win.hasMoreBelow;
  }
  const rendered = targetItems.map((item, idx) => {
    const actualIdx = offset + idx;
    let line = `${indent}${bullet}${item}`;
    if (options.focusedIndex === actualIdx && options.focusStyle) return options.focusStyle(line);
    return line;
  }).join('\n');
  let out = rendered;
  if (hasMoreAbove) out = `${indent}  ↑ more…\n` + out;
  if (hasMoreBelow) out = out + `\n${indent}  ↓ more…`;
  return out;
}
