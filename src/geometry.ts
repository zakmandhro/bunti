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
