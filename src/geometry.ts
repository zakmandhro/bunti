/**
 * Bunti Rect Geometry
 *
 * Rect is the layout primitive: components resolve a rect first, then
 * render and hit-test against the same resolved cells.
 */

import { resolveSize, type SizeUnit } from './layout';

/** An absolute cell rectangle: x/y origin plus width/height in cells. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A partial rect resolved against a parent area. */
export interface RectInput {
  /** Column offset within the parent (default 0). */
  x?: number;
  /** Row offset within the parent (default 0). */
  y?: number;
  /** Width: cells, '50%', '1fr', or 'auto' (falls back to contentWidth). */
  width?: SizeUnit;
  /** Height: rows, '50%', '1fr', or 'auto' (falls back to contentHeight). */
  height?: SizeUnit;
  /** Intrinsic content width used when width is 'auto'/undefined. */
  contentWidth?: number;
  /** Intrinsic content height used when height is 'auto'/undefined. */
  contentHeight?: number;
}

/** RectInput plus edge anchoring for resolvePlacedRect(). */
export interface PlacedRectInput extends RectInput {
  /** Pins the rect to the top or bottom edge at x = 0. */
  anchor?: 'top' | 'bottom';
}

/** Placement defaults applied when x/y are omitted (default centered). */
export interface PlacedRectOptions {
  defaultX?: 'left' | 'center' | 'right';
  defaultY?: 'top' | 'center' | 'bottom';
}

/** Axis for splitRect(). */
export type Direction = 'horizontal' | 'vertical';

/** Options for splitRect() / ctx.split(). */
export interface SplitOptions {
  /** Axis the tracks are laid along. */
  direction: Direction;
  /**
   * One entry per track: absolute cells (24), percent ('30%'), or fill
   * fractions ('1fr', '2fr') sharing the remaining space.
   */
  constraints: SizeUnit[];
  /** Blank cells between adjacent tracks (default 0). */
  gap?: number;
}

/**
 * Resolves a RectInput against a parent rect into absolute cells
 * (top-left placement; use resolvePlacedRect for alignment defaults).
 */
export function resolveRect(parent: Rect, input: RectInput): Rect {
  const width = Math.max(
    0,
    resolveSize(input.width, parent.width, input.contentWidth ?? 0),
  );
  const height = Math.max(
    0,
    resolveSize(input.height, parent.height, input.contentHeight ?? 0),
  );

  return {
    x: parent.x + (input.x ?? 0),
    y: parent.y + (input.y ?? 0),
    width,
    height,
  };
}

/**
 * Places a rect within a parent with alignment defaults (centered unless
 * overridden) and optional top/bottom anchoring — the placement box() uses.
 */
export function resolvePlacedRect(
  parent: Rect,
  input: PlacedRectInput,
  options: PlacedRectOptions = {},
): Rect {
  const width = Math.max(
    0,
    resolveSize(input.width, parent.width, input.contentWidth ?? 0),
  );
  const height = Math.max(
    0,
    resolveSize(input.height, parent.height, input.contentHeight ?? 0),
  );
  const defaultX = options.defaultX ?? 'center';
  const defaultY = options.defaultY ?? 'center';

  let x = input.x;
  if (input.anchor === 'top' || input.anchor === 'bottom') x = 0;
  if (x === undefined) {
    if (defaultX === 'right') x = Math.max(0, parent.width - width);
    else if (defaultX === 'center')
      x = Math.max(0, Math.floor((parent.width - width) / 2));
    else x = 0;
  }

  let y = input.y;
  if (input.anchor === 'top') y = 0;
  else if (input.anchor === 'bottom') y = parent.height - height;
  if (y === undefined) {
    if (defaultY === 'bottom') y = Math.max(0, parent.height - height);
    else if (defaultY === 'center')
      y = Math.max(0, Math.floor((parent.height - height) / 2));
    else y = 0;
  }

  return {
    x: parent.x + x,
    y: parent.y + y,
    width,
    height,
  };
}

/** Shrinks a rect by a uniform or per-side inset (clamped at zero size). */
export function innerRect(
  rect: Rect,
  inset:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number },
): Rect {
  const sides =
    typeof inset === 'number'
      ? { top: inset, right: inset, bottom: inset, left: inset }
      : {
          top: inset.top ?? 0,
          right: inset.right ?? 0,
          bottom: inset.bottom ?? 0,
          left: inset.left ?? 0,
        };

  return {
    x: rect.x + sides.left,
    y: rect.y + sides.top,
    width: Math.max(0, rect.width - sides.left - sides.right),
    height: Math.max(0, rect.height - sides.top - sides.bottom),
  };
}

function frWeight(unit: SizeUnit): number {
  if (typeof unit !== 'string' || !unit.endsWith('fr')) return 0;
  const parsed = Number.parseFloat(unit.slice(0, -2));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function fixedTrackSize(unit: SizeUnit, available: number): number | undefined {
  if (typeof unit === 'number') return Math.max(0, unit);
  if (typeof unit === 'string' && unit.endsWith('%')) {
    return Math.max(0, Math.floor((available * Number.parseFloat(unit)) / 100));
  }
  return undefined;
}

/**
 * Splits a rect into adjacent tracks from fixed sizes, percentages, and
 * 'fr' fill units (the last fluid track absorbs rounding leftovers).
 * @example const [side, main] = splitRect(area, { direction: 'horizontal', constraints: [24, '1fr'] });
 */
export function splitRect(rect: Rect, options: SplitOptions): Rect[] {
  const gap = Math.max(0, options.gap ?? 0);
  const mainSize =
    options.direction === 'horizontal' ? rect.width : rect.height;
  const crossSize =
    options.direction === 'horizontal' ? rect.height : rect.width;
  const available = Math.max(
    0,
    mainSize - gap * Math.max(0, options.constraints.length - 1),
  );

  const sizes: (number | undefined)[] = options.constraints.map((constraint) =>
    fixedTrackSize(constraint, available),
  );
  const fixedTotal = sizes.reduce<number>((sum, size) => sum + (size ?? 0), 0);
  const remaining = Math.max(0, available - fixedTotal);
  const totalFr = options.constraints.reduce<number>(
    (sum, constraint) => sum + frWeight(constraint),
    0,
  );

  let assigned = fixedTotal;
  for (let index = 0; index < sizes.length; index++) {
    if (sizes[index] !== undefined) continue;
    const weight = frWeight(options.constraints[index]!);
    const isLastFluid = options.constraints
      .slice(index + 1)
      .every((constraint) => frWeight(constraint) === 0);
    const size = isLastFluid
      ? Math.max(0, available - assigned)
      : Math.floor((remaining * weight) / Math.max(1, totalFr));
    sizes[index] = size;
    assigned += size;
  }

  let cursor = options.direction === 'horizontal' ? rect.x : rect.y;
  return sizes.map((size = 0) => {
    const area =
      options.direction === 'horizontal'
        ? { x: cursor, y: rect.y, width: size, height: crossSize }
        : { x: rect.x, y: cursor, width: crossSize, height: size };
    cursor += size + gap;
    return area;
  });
}
