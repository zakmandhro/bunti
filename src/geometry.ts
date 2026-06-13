import { resolveSize, type SizeUnit } from './layout';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RectInput {
  x?: number;
  y?: number;
  width?: SizeUnit;
  height?: SizeUnit;
  contentWidth?: number;
  contentHeight?: number;
}

export interface PlacedRectInput extends RectInput {
  anchor?: 'top' | 'bottom';
}

export interface PlacedRectOptions {
  defaultX?: 'left' | 'center';
  defaultY?: 'top' | 'center';
}

export type Direction = 'horizontal' | 'vertical';

export interface SplitOptions {
  direction: Direction;
  constraints: SizeUnit[];
  gap?: number;
}

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
    x =
      defaultX === 'center'
        ? Math.max(0, Math.floor((parent.width - width) / 2))
        : 0;
  }

  let y = input.y;
  if (input.anchor === 'top') y = 0;
  else if (input.anchor === 'bottom') y = parent.height - height;
  if (y === undefined) {
    y =
      defaultY === 'center'
        ? Math.max(0, Math.floor((parent.height - height) / 2))
        : 0;
  }

  return {
    x: parent.x + x,
    y: parent.y + y,
    width,
    height,
  };
}

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
