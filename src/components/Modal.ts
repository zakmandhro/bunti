import type { BuntiContext } from '../dsl';

export interface ModalProps {
  width: number;
  height: number;
  border?:
    | 'default'
    | 'rounded'
    | 'double'
    | 'dashed'
    | 'dotted'
    | 'frame'
    | 'thick-frame'
    | 'classic'
    | 'none';
  borderColor?: any;
  bgColor?: any;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  padding?: [number, number];
}

export function Modal(
  ctx: BuntiContext,
  props: ModalProps,
  callback: (sub: BuntiContext) => void,
) {
  const theme = ctx.theme;
  const parentW = ctx.width;
  const parentH = ctx.height;
  const modalW = props.width;
  const modalH = props.height;

  const localX = Math.max(0, Math.floor((parentW - modalW) / 2));
  const localY = Math.max(0, Math.floor((parentH - modalH) / 2));
  const x = ctx.offsetX + localX;
  const y = ctx.offsetY + localY;

  // 1. Draw solid background rect for the modal. Defaults to the raised
  // surface token so the dialog reads as floating above the screen.
  ctx.rect(x, y, modalW, modalH, {
    char: ' ',
    bg: props.bgColor || theme.surfaceRaised,
  });

  // 2. Draw the Box enclosing the modal content
  return ctx.box(
    {
      x: localX,
      y: localY,
      width: modalW,
      height: modalH,
      border: props.border ?? 'double',
      borderColor: props.borderColor ?? theme.border,
      // Content fallback fg: explicit ANSI styling in content still wins.
      color: theme.foreground,
      align: props.align ?? 'center',
      valign: props.valign,
      padding: props.padding,
    },
    callback,
  );
}
