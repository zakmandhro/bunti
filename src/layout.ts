import { visibleWidth, truncate } from './utils';

export interface StyleOptions {
  width?: number;
  maxWidth?: number;
  height?: number;
  padding?: [number, number]; // [vertical, horizontal]
  border?: 'normal' | 'rounded' | 'none';
  borderColor?: (s: string) => string;
  align?: 'left' | 'center' | 'right';
}

const BORDERS = {
  normal: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
};

/**
 * Creates a styled box block from content
 */
export function box(content: string, options: StyleOptions = {}): string {
  let lines = content.split('\n');

  if (options.maxWidth) {
    const paddingX = options.padding?.[1] || 0;
    const borderOffset = options.border && options.border !== 'none' ? 2 : 0;
    const targetContentWidth = options.maxWidth - (paddingX * 2) - borderOffset;
    lines = lines.map(line => truncate(line, targetContentWidth));
  }

  const maxContentWidth = Math.max(...lines.map(visibleWidth), 0);
  const width = options.width || maxContentWidth + (options.padding?.[1] || 0) * 2;
  const paddingX = options.padding?.[1] || 0;
  const paddingY = options.padding?.[0] || 0;

  let out = [];
  const border = options.border && options.border !== 'none' ? BORDERS[options.border] : null;
  const color = options.borderColor || ((s: string) => s);

  if (border) out.push(color(border.tl + border.h.repeat(width) + border.tr));
  for (let i = 0; i < paddingY; i++) out.push((border ? color(border.v) : '') + ' '.repeat(width) + (border ? color(border.v) : ''));

  for (const line of lines) {
    const cleanLen = visibleWidth(line);
    const padTotal = Math.max(0, width - cleanLen - (paddingX * 2));
    let pLeft = 0, pRight = padTotal;
    if (options.align === 'center') { pLeft = Math.floor(padTotal / 2); pRight = Math.ceil(padTotal / 2); }
    else if (options.align === 'right') { pLeft = padTotal; pRight = 0; }
    let row = '';
    if (border) row += color(border.v);
    row += ' '.repeat(paddingX + pLeft) + line + ' '.repeat(paddingX + pRight);
    if (border) row += color(border.v);
    out.push(row);
  }

  for (let i = 0; i < paddingY; i++) out.push((border ? color(border.v) : '') + ' '.repeat(width) + (border ? color(border.v) : ''));
  if (border) out.push(color(border.bl + border.h.repeat(width) + border.br));

  return out.join('\n');
}

/**
 * Joins two or more string blocks horizontally (side-by-side)
 */
export function joinHorizontal(...blocks: string[]): string {
  if (blocks.length === 0) return '';
  const parsedBlocks = blocks.map(b => b.split('\n'));
  const maxHeight = Math.max(...parsedBlocks.map(b => b.length));
  const blockWidths = parsedBlocks.map(block => Math.max(...block.map(visibleWidth), 0));
  let out = [];
  for (let i = 0; i < maxHeight; i++) {
    let row = '';
    for (let bIndex = 0; bIndex < parsedBlocks.length; bIndex++) {
      const block = parsedBlocks[bIndex]!;
      const targetWidth = blockWidths[bIndex]!;
      if (block[i] !== undefined) {
        const line = block[i]!;
        const missing = Math.max(0, targetWidth - visibleWidth(line));
        row += line + ' '.repeat(missing);
      } else { row += ' '.repeat(targetWidth); }
    }
    out.push(row);
  }
  return out.join('\n');
}

/**
 * Joins two or more string blocks vertically (one on top of another)
 */
export function joinVertical(...blocks: string[]): string {
  return blocks.filter(Boolean).join('\n');
}

/**
 * Creates a reusable style function (theming)
 */
export function createStyle(defaults: StyleOptions) {
  return (content: string, overrides: StyleOptions = {}) => {
    return box(content, { ...defaults, ...overrides });
  };
}

/**
 * Creates a styled badge block
 */
export function badge(text: string, colorFn: (s: string) => string = (s) => s): string {
  return colorFn(` ${text.toUpperCase()} `);
}

/**
 * Scroll windowing logic for lists
 */
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

/**
 * Renders a vertical list of items with optional focus highlighting and windowing.
 */
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
