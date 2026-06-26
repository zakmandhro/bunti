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
  const parentW = ctx.width;
  const parentH = ctx.height;
  const modalW = props.width;
  const modalH = props.height;

  // Center coordinate relative to current context bounds
  const x = ctx.offsetX + Math.max(0, Math.floor((parentW - modalW) / 2));
  const y = ctx.offsetY + Math.max(0, Math.floor((parentH - modalH) / 2));

  // 1. Draw solid background rect for the modal
  ctx.rect(x, y, modalW, modalH, {
    char: ' ',
    bg: props.bgColor || { r: 0, g: 0, b: 0 },
  });

  // 2. Draw the Box enclosing the modal content
  return ctx.box(
    {
      x,
      y,
      width: modalW,
      height: modalH,
      border: props.border ?? 'double',
      borderColor: props.borderColor,
      align: props.align ?? 'center',
      valign: props.valign,
      padding: props.padding,
    },
    callback,
  );
}
