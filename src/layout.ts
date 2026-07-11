/**
 * Bunti Functional Layout & Drawing
 * Strictly functional primitives for buffer manipulation and layout generation.
 */

import { fg as fgColor, isThemeColor, resolveColor } from './colors';
import { replaceEmojis } from './icons';
import type { Cell, RGB, ScreenState } from './state';
import type { ThemeColor } from './theme';
import { charWidth, truncate, visibleWidth, wrapText } from './utils';

// --- Functional Primitives (Buffer Manipulation) ---

export function setCell(
  state: ScreenState,
  x: number,
  y: number,
  cell: Partial<Cell>,
) {
  if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
    const target = state.backBuffer[y * state.width + x];
    let displayWidth = 1;
    if (cell.char !== undefined) {
      target!.char = cell.raw ? cell.char : replaceEmojis(cell.char);
      // Single-ASCII-char cells (fills, borders' spaces, plain text) skip width math.
      displayWidth =
        target!.char.length === 1 && target!.char.charCodeAt(0) < 0x80
          ? 1
          : charWidth(target!.char);
      target!.fg = undefined;
      target!.fgCode = undefined;
      target!.bold = false;
      target!.italic = false;
      target!.underline = false;
      target!.dim = false;
      target!.strike = false;
    }
    if (cell.fg !== undefined) {
      target!.fg = cell.fg;
      target!.fgCode = resolveColor(cell.fg);
    }
    if (cell.bg !== undefined) {
      target!.bg = cell.bg;
      target!.bgCode = resolveColor(cell.bg);
    }
    if (cell.bold !== undefined) target!.bold = cell.bold;
    if (cell.italic !== undefined) target!.italic = cell.italic;
    if (cell.underline !== undefined) target!.underline = cell.underline;
    if (cell.dim !== undefined) target!.dim = cell.dim;
    if (cell.strike !== undefined) target!.strike = cell.strike;
    target!.skip = cell.skip ?? false;

    for (let dx = 1; dx < displayWidth; dx++) {
      const skipX = x + dx;
      if (skipX >= state.width) break;
      const skip = state.backBuffer[y * state.width + skipX]!;
      skip.char = '';
      skip.fg = target!.fg;
      skip.bg = target!.bg;
      skip.fgCode = target!.fgCode;
      skip.bgCode = target!.bgCode;
      skip.bold = target!.bold;
      skip.italic = target!.italic;
      skip.underline = target!.underline;
      skip.dim = target!.dim;
      skip.strike = target!.strike;
      skip.skip = true;
    }
  }
}

import type { Gradient } from './colors';

export interface RectOptions {
  char?: string;
  fg?: string | number | RGB | ThemeColor;
  bg?: string | number | RGB | Gradient | ThemeColor;
}

export function rect(
  state: ScreenState,
  x: number,
  y: number,
  w: number,
  h: number,
  style: RectOptions,
) {
  const isGradient =
    style.bg && typeof style.bg === 'object' && 'colors' in style.bg;

  for (let dy = 0; dy < h; dy++) {
    const row = y + dy;
    if (row < 0 || row >= state.height) continue;

    for (let dx = 0; dx < w; dx++) {
      const col = x + dx;
      if (col < 0 || col >= state.width) continue;

      let resolvedBg: string | number | RGB | undefined;

      if (isGradient) {
        const grad = style.bg as any;
        if (grad.direction === 'horizontal') {
          resolvedBg = grad.colors[Math.floor((dx / w) * grad.colors.length)];
        } else {
          resolvedBg = grad.colors[Math.floor((dy / h) * grad.colors.length)];
        }
      } else {
        resolvedBg =
          style.bg !== undefined
            ? resolveColor(style.bg as string | number | RGB | ThemeColor)
            : undefined;
      }

      const cell: Partial<Cell> = { bg: resolvedBg };
      if (style.char) cell.char = style.char;
      if (style.fg) cell.fg = resolveColor(style.fg) as any;

      const existing = state.backBuffer[row * state.width + col]!;
      if (existing.char !== ' ' && !style.char) {
        // Keep existing char/fg if drawing a pure background
        cell.char = existing.char;
        cell.fg = existing.fg;
      }

      setCell(state, col, row, cell);
    }
  }
}

export function blit(
  state: ScreenState,
  startX: number,
  startY: number,
  content: string,
  style: Partial<Cell> = {},
) {
  const lines = content.split('\n');
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    let x = startX;
    let currentFg: any, currentBg: any;
    let currentBold = false;
    let currentItalic = false;
    let currentUnderline = false;
    let currentDim = false;
    let currentStrike = false;
    const regex = /\x1B\[([0-9;]*)m|([^\x1B]+)/g;
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(line!)) !== null) {
      if (match[1] !== undefined) {
        const codes = match[1].split(';');
        for (let i = 0; i < codes.length; i++) {
          const code = parseInt(codes[i] || '0', 10);
          if (code === 0) {
            currentFg = undefined;
            currentBg = undefined;
            currentBold = false;
            currentItalic = false;
            currentUnderline = false;
            currentDim = false;
            currentStrike = false;
          } else if (code === 1) currentBold = true;
          else if (code === 2) currentDim = true;
          else if (code === 3) currentItalic = true;
          else if (code === 4) currentUnderline = true;
          else if (code === 9) currentStrike = true;
          else if (code === 22) {
            // SGR 22 resets intensity: clears BOTH bold and dim.
            currentBold = false;
            currentDim = false;
          } else if (code === 23) currentItalic = false;
          else if (code === 24) currentUnderline = false;
          else if (code === 29) currentStrike = false;
          else if (code >= 30 && code <= 37) currentFg = (code - 30).toString();
          else if (code >= 40 && code <= 47) currentBg = (code - 40).toString();
          else if (code >= 90 && code <= 97)
            currentFg = (code - 90 + 8).toString();
          else if (code >= 100 && code <= 107)
            currentBg = (code - 100 + 8).toString();
          else if (code === 38 && codes[i + 1] === '5') {
            currentFg = parseInt(codes[i + 2]!, 10);
            i += 2;
          } else if (code === 38 && codes[i + 1] === '2') {
            currentFg = {
              r: parseInt(codes[i + 2]!, 10),
              g: parseInt(codes[i + 3]!, 10),
              b: parseInt(codes[i + 4]!, 10),
            };
            i += 4;
          } else if (code === 48 && codes[i + 1] === '5') {
            currentBg = parseInt(codes[i + 2]!, 10);
            i += 2;
          } else if (code === 48 && codes[i + 1] === '2') {
            currentBg = {
              r: parseInt(codes[i + 2]!, 10),
              g: parseInt(codes[i + 3]!, 10),
              b: parseInt(codes[i + 4]!, 10),
            };
            i += 4;
          } else if (code === 39) currentFg = undefined;
          else if (code === 49) currentBg = undefined;
        }
      } else if (match[2]) {
        const processedText = replaceEmojis(match[2]);
        const segmenter = new Intl.Segmenter('en', {
          granularity: 'grapheme',
        });
        for (const { segment } of segmenter.segment(processedText)) {
          const w = charWidth(segment);
          if (w === 0) continue;

          const cell: Partial<Cell> = { char: segment, ...style };

          // Only overwrite buffer colors if explicitly set in the string or style
          if (currentFg !== undefined) cell.fg = currentFg;
          else if (style.fg !== undefined) cell.fg = style.fg;
          else if (state.options.defaultFg !== undefined)
            cell.fg = state.options.defaultFg;

          if (currentBg !== undefined) cell.bg = currentBg;
          else if (style.bg !== undefined) cell.bg = style.bg;

          if (currentBold) cell.bold = true;
          if (currentItalic) cell.italic = true;
          if (currentUnderline) cell.underline = true;
          if (currentDim) cell.dim = true;
          if (currentStrike) cell.strike = true;

          setCell(state, x, startY + row, cell);
          x += w;
        }
      }
    }
  }
}

// --- High-Level Layout ---

export type BorderStyle =
  | 'default'
  | 'rounded'
  | 'double'
  | 'dashed'
  | 'dotted'
  | 'frame'
  | 'thick-frame'
  | 'classic'
  | 'none';

export interface SideColors {
  top?: any;
  bottom?: any;
  left?: any;
  right?: any;
}

export type SizeUnit = number | string; // e.g. 20, "50%", "1fr"

export interface StyleOptions {
  width?: SizeUnit;
  minWidth?: number;
  maxWidth?: number;
  height?: SizeUnit;
  minHeight?: number;
  maxHeight?: number;
  padding?: [number, number];
  border?: BorderStyle;
  borderColor?:
    | string
    | number
    | RGB
    | ThemeColor
    | ((s: string) => string)
    | SideColors;
  bgColor?: string | number | RGB | Gradient | ThemeColor;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  title?: string;
  titleStyle?: (s: string) => string;
}

const BORDERS: Record<string, any> = {
  default: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  dashed: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '╌', v: '╎' },
  dotted: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '┈', v: '┊' },
  frame: {
    tl: '█',
    tr: '█',
    bl: '█',
    br: '█',
    top: '▀',
    bottom: '▄',
    left: '█',
    right: '█',
  },
  'thick-frame': { tl: '█', tr: '█', bl: '█', br: '█', h: '█', v: '█' },
  classic: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
};

/**
 * Resolves a SizeUnit to an absolute integer based on parent dimensions.
 */
export function resolveSize(
  unit: SizeUnit | undefined,
  parentDim: number,
  contentDim: number,
): number {
  if (unit === undefined || unit === 'auto') return contentDim;
  if (typeof unit === 'number') return unit;
  if (typeof unit === 'string') {
    if (unit.endsWith('%')) {
      const pct = parseFloat(unit) / 100;
      return Math.floor(parentDim * pct);
    }
    if (unit.endsWith('fr')) {
      return parentDim;
    }
  }
  return contentDim;
}

/**
 * Generates a styled box string with perfect alignment and optional wrapping.
 */
export function box(
  content: string,
  options: StyleOptions = {},
  parentW?: number,
  parentH?: number,
): string {
  // Ensure we operate on the swapped glyphs for all layout math
  content = replaceEmojis(content);

  const px = options.padding?.[1] ?? 0;
  const py = options.padding?.[0] ?? 0;
  const borderStyle = options.border || 'none';
  const borderOffset = borderStyle === 'none' ? 0 : 2;

  const rawLines = content.split('\n');
  const maxRawW = Math.max(...rawLines.map((l) => visibleWidth(l)), 0);
  const intrinsicW = maxRawW + px * 2 + borderOffset;

  // 1. Resolve Target Width (Outer)
  const resolvedW = resolveSize(options.width, parentW || 0, intrinsicW);

  // 2. Calculate Inner Width (between borders, including padding)
  let targetInnerW = Math.max(0, resolvedW - borderOffset);

  if (options.minWidth)
    targetInnerW = Math.max(targetInnerW, options.minWidth - borderOffset);
  if (options.maxWidth)
    targetInnerW = Math.min(targetInnerW, options.maxWidth - borderOffset);

  let lines: string[] = [];
  const contentWidth = Math.max(0, targetInnerW - px * 2);
  if (options.wrap && contentWidth > 0) {
    lines = wrapText(content, contentWidth);
  } else {
    lines = content.split('\n').map((l) => truncate(l, contentWidth));
  }

  const contentH = lines.length + py * 2;
  const resolvedH = resolveSize(options.height, parentH || 0, contentH);
  let finalInnerH = resolvedH ? resolvedH - borderOffset : contentH;
  if (options.minHeight)
    finalInnerH = Math.max(finalInnerH, options.minHeight - borderOffset);
  if (options.maxHeight)
    finalInnerH = Math.min(finalInnerH, options.maxHeight - borderOffset);

  const b =
    borderStyle === 'none'
      ? null
      : BORDERS[borderStyle as keyof typeof BORDERS] || BORDERS.default;

  // Color Resolution
  // ThemeColors are callable, so they must be detected BEFORE the
  // function-style border-wrapper path (brand check via isThemeColor).
  const resolveSide = (color: any) =>
    isThemeColor(color)
      ? (s: string) => fgColor(color.rgb, s)
      : typeof color === 'function'
        ? color
        : (s: string) => fgColor(color, s);
  const wrapBg = (s: string) => {
    if (!options.bgColor) return s;
    if (typeof options.bgColor === 'object' && 'colors' in options.bgColor) {
      // Gradients cannot be wrapped as a single ANSI string because they change per-cell.
      // In string-building mode, we must ignore gradients. They are handled in absolute rect mode.
      return s;
    }
    const code = resolveColor(options.bgColor);
    if (code === undefined) return s; // mono tier: no color output
    const codeStr = String(code);
    const prefix = codeStr.startsWith('2;') ? '48' : '48;5';
    const bgOn = `\x1b[${prefix};${codeStr}m`;
    // Apply bg, and if the string contains resets, re-apply the bg right after the reset.
    // We add a final reset at the very end to clean up.
    return `${bgOn + s.replace(/\x1b\[0m/g, `\x1b[0m${bgOn}`)}\x1b[0m`;
  };

  const bc = options.borderColor;
  const colors =
    typeof bc === 'object' && !('r' in bc)
      ? {
          top: resolveSide(
            (bc as SideColors).top ||
              (bc as SideColors).left ||
              (bc as SideColors).right,
          ),
          bottom: resolveSide(
            (bc as SideColors).bottom ||
              (bc as SideColors).left ||
              (bc as SideColors).right,
          ),
          left: resolveSide((bc as SideColors).left || (bc as SideColors).top),
          right: resolveSide(
            (bc as SideColors).right || (bc as SideColors).top,
          ),
        }
      : {
          top: resolveSide(bc || ((s: string) => s)),
          bottom: resolveSide(bc || ((s: string) => s)),
          left: resolveSide(bc || ((s: string) => s)),
          right: resolveSide(bc || ((s: string) => s)),
        };

  const hTop = b?.top || b?.h || ' ';
  const hBottom = b?.bottom || b?.h || ' ';
  const vLeft = b?.left || b?.v || ' ';
  const vRight = b?.right || b?.v || ' ';

  const vSpace = Math.max(0, finalInnerH - lines.length - py * 2);
  let topS = 0,
    bottomS = vSpace;
  if (options.valign === 'middle') {
    topS = Math.floor(vSpace / 2);
    bottomS = Math.ceil(vSpace / 2);
  } else if (options.valign === 'bottom') {
    topS = vSpace;
    bottomS = 0;
  }

  const out = [];

  // Top Border
  if (b) {
    const title =
      options.title && targetInnerW > 2
        ? truncate(` ${options.title.trim()} `, targetInnerW)
        : '';
    const styledTitle = options.titleStyle ? options.titleStyle(title) : title;
    const titleW = visibleWidth(title);
    const beforeTitle = title ? 1 : 0;
    const afterTitle = Math.max(0, targetInnerW - beforeTitle - titleW);

    out.push(
      wrapBg(
        colors.top(b.tl) +
          colors.top(hTop.repeat(beforeTitle)) +
          styledTitle +
          colors.top(hTop.repeat(afterTitle)) +
          colors.top(b.tr),
      ),
    );
  }

  // Top Padding
  for (let i = 0; i < py + topS; i++) {
    let row = b ? colors.left(vLeft) : '';
    row += wrapBg(' '.repeat(targetInnerW));
    if (b) row += colors.right(vRight);
    out.push(row);
  }

  // Content Lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trimEnd();
    const lineW = visibleWidth(line);
    const extra = Math.max(0, targetInnerW - lineW - px * 2);
    let left = 0,
      right = 0;
    const align = options.align || 'left';

    if (align === 'center') {
      left = px + Math.floor(extra / 2);
      right = px + Math.ceil(extra / 2);
    } else if (align === 'right') {
      left = px + extra;
      right = px;
    } else {
      left = px;
      right = px + extra;
    }

    let row = b ? colors.left(vLeft) : '';
    row += wrapBg(
      ' '.repeat(Math.max(0, left)) + line + ' '.repeat(Math.max(0, right)),
    );
    if (b) row += colors.right(vRight);
    out.push(row);
  }

  // Bottom Padding
  for (let i = 0; i < py + bottomS; i++) {
    let row = b ? colors.left(vLeft) : '';
    row += wrapBg(' '.repeat(targetInnerW));
    if (b) row += colors.right(vRight);
    out.push(row);
  }

  // Bottom Border
  if (b) {
    out.push(
      wrapBg(
        colors.bottom(b.bl) +
          colors.bottom(hBottom.repeat(targetInnerW)) +
          colors.bottom(b.br),
      ),
    );
  }

  return out.join('\n');
}

export function joinHorizontal(...blocks: string[]): string {
  const parsed = blocks.map((b) => b.split('\n'));
  const maxH = Math.max(...parsed.map((p) => p.length));
  const widths = parsed.map((p) => Math.max(...p.map(visibleWidth)));

  const out = [];
  for (let i = 0; i < maxH; i++) {
    let row = '';
    for (let j = 0; j < parsed.length; j++) {
      const block = parsed[j]!;
      const targetW = widths[j]!;
      if (block[i] !== undefined) {
        row +=
          block[i]! +
          ' '.repeat(Math.max(0, targetW - visibleWidth(block[i]!)));
      } else {
        row += ' '.repeat(targetW);
      }
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

export function badge(
  text: string,
  colorFn: (s: string) => string = (s) => s,
): string {
  return colorFn(` ${text.toUpperCase()} `);
}

export interface TableOptions {
  width?: SizeUnit;
  columns?: { width?: SizeUnit; align?: 'left' | 'center' | 'right' }[];
  border?: BorderStyle;
  padding?: [number, number];
}

/**
 * Renders a data table with perfectly aligned columns and shared borders.
 */
export function table(
  rows: string[][],
  options: TableOptions = {},
  parentW?: number,
): string {
  const borderStyle = options.border || 'default';
  const _px = options.padding?.[1] ?? 1;
  const _py = options.padding?.[0] ?? 0;

  const colCount = rows[0]?.length || 0;
  if (colCount === 0) return '';

  // 1. Resolve Column Widths
  const resolvedWidth = resolveSize(options.width, parentW || 0, 80);
  const gutterW = 1;
  const colWidth = Math.floor(
    (resolvedWidth - (colCount - 1) * gutterW) / colCount,
  );

  // 2. Render each cell as a rigid block
  const renderedRows = rows.map((row) => {
    const cells = row.map((content, i) => {
      // Explicitly pad empty content to ensure it occupies the full column width
      const safeContent = content || ' '.repeat(colWidth);
      const cellAlign = options.columns?.[i]?.align
        ? options.columns[i].align
        : 'left';

      return box(
        safeContent,
        {
          width: colWidth,
          border: 'none',
          // Strict internal zero-padding; let the gutter handle spacing
          padding: [0, 0],
          align: cellAlign as 'left' | 'center' | 'right',
        },
        colWidth,
        0,
      );
    });
    // Join with gutter
    return joinHorizontal(
      ...cells.flatMap((c, i) =>
        i < cells.length - 1 ? [c, ' '.repeat(gutterW)] : [c],
      ),
    );
  });

  return box(joinVertical(...renderedRows), {
    border: borderStyle,
    padding: [0, 0],
    width: resolvedWidth,
    align: 'left',
  });
}

export function getWindow<T>(
  items: T[],
  selectedIndex: number,
  maxVisible: number,
) {
  const start = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(maxVisible / 2),
      items.length - maxVisible,
    ),
  );
  const visible = items.slice(start, start + maxVisible);
  return {
    visible,
    start,
    hasMoreAbove: start > 0,
    hasMoreBelow: start + maxVisible < items.length,
  };
}

export interface ListOptions {
  bullet?: string;
  indent?: number;
  focusedIndex?: number;
  focusStyle?: (s: string) => string;
  selectedBg?: string | number | RGB | ThemeColor;
  width?: SizeUnit;
  maxVisible?: number;
  interactive?: boolean;
}

export function list(
  items: string[],
  options: ListOptions = {},
  parentW?: number,
): string {
  const bullet = options.bullet || '';
  const indent = ' '.repeat(options.indent || 0);
  const resolvedW = resolveSize(options.width, parentW || 0, 0);
  const wrapSelectedBg = (line: string) => {
    if (!options.selectedBg) return line;
    const code = resolveColor(options.selectedBg);
    if (code === undefined) return line; // mono tier: no color output
    const codeStr = String(code);
    const prefix = codeStr.startsWith('2;') ? '48' : '48;5';
    const bgOn = `\x1b[${prefix};${codeStr}m`;
    return `${bgOn + line.replace(/\x1b\[0m/g, `\x1b[0m${bgOn}`)}\x1b[0m`;
  };
  let targetItems = items,
    offset = 0,
    hasMoreAbove = false,
    hasMoreBelow = false;
  if (options.maxVisible && items.length > options.maxVisible) {
    const win = getWindow(items, options.focusedIndex || 0, options.maxVisible);
    targetItems = win.visible;
    offset = win.start;
    hasMoreAbove = win.hasMoreAbove;
    hasMoreBelow = win.hasMoreBelow;
  }
  const rendered = targetItems
    .map((item, idx) => {
      const actualIdx = offset + idx;
      const line = `${indent}${bullet}${item}`;
      if (options.focusedIndex === actualIdx) {
        const styledLine = options.focusStyle ? options.focusStyle(line) : line;
        if (!options.selectedBg) return styledLine;
        const paddedLine =
          resolvedW > 0
            ? styledLine +
              ' '.repeat(Math.max(0, resolvedW - visibleWidth(styledLine)))
            : styledLine;
        return wrapSelectedBg(paddedLine);
      }
      return line;
    })
    .join('\n');
  let out = rendered;
  if (hasMoreAbove) out = `${indent}  ↑ more…\n${out}`;
  if (hasMoreBelow) out = `${out}\n${indent}  ↓ more…`;
  return out;
}

export function viewport(
  content: string,
  width: number,
  height: number,
  scrollY: number = 0,
): string {
  const lines = content.split('\n');
  const visibleLines = lines.slice(scrollY, scrollY + height);

  return visibleLines
    .map((line) => {
      return truncate(line, width, '');
    })
    .join('\n');
}

export function wallpaper(state: any, options: { bg: any }) {
  const { bg } = options;
  rect(state, 0, 0, state.width, state.height, { char: ' ', bg });
}

export function gradient(
  state: any,
  colors: any[],
  options: { direction?: 'vertical' | 'horizontal' } = {},
) {
  const { direction = 'vertical' } = options;
  rect(state, 0, 0, state.width, state.height, {
    char: ' ',
    bg: {
      colors,
      direction,
      steps: direction === 'vertical' ? state.height : state.width,
    },
  });
}
