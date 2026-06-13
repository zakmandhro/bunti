import { adjustBrightness } from '../colors';
import type { BuntiContext, DSLBoxOptions } from '../dsl';

export interface ButtonProps extends DSLBoxOptions {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: () => void;
}

/**
 * Tactical Button Component
 * Fully reactive to keyboard focus and action events.
 */
export function Button(ctx: BuntiContext, props: ButtonProps) {
  const {
    box,
    color,
    focusable,
    state,
    offsetX,
    offsetY,
    mouseX,
    mouseY,
    isMouseDown,
  } = ctx;

  // 1. Register in the global focus loop (for TAB navigation)
  const isSelected = focusable(props.id);

  // 2. Resolve final dimensions to perform Mouse Hit-Testing
  const finalLabel = props.icon ? `${props.icon} ${props.label}` : props.label;
  const isGhost = props.variant === 'ghost';
  const isPill = props.variant === 'primary';
  const filled = isPill || props.variant === 'danger';
  const w = props.width || Math.max(12, finalLabel.length + (isPill ? 6 : 4));
  const h = props.height || (filled || isGhost ? 1 : 3);

  const resolvedW = typeof w === 'number' ? w : ctx.width;
  const absX =
    props.x !== undefined
      ? offsetX + props.x
      : props.width === '100%'
        ? offsetX
        : offsetX + Math.max(0, Math.floor((ctx.width - resolvedW) / 2));
  const absY = offsetY + ctx.cursorY;

  const isHovered =
    mouseX >= absX &&
    mouseX < absX + resolvedW &&
    mouseY >= absY &&
    mouseY < absY + (h as number);
  const isActive = isSelected || isHovered;

  // 3. Resolve Theme & State
  let bg: any = 254; // Near white
  let fg: any = 'black';
  let borderCol: any = { r: 217, g: 216, b: 213 };

  if (props.variant === 'primary') {
    bg = isActive ? 'sky' : 'bunti-blue';
    fg = 'white';
    borderCol = bg;
  } else if (props.variant === 'danger') {
    bg = 'error';
    borderCol = adjustBrightness('error', 20);
    fg = 'white';
  } else if (isGhost) {
    bg = undefined;
    fg = isActive ? 'white' : 'silver';
    borderCol = 'ash';
  }

  if (isActive) {
    if (props.variant !== 'primary' && !isGhost) {
      borderCol = 'black';
      if (isMouseDown && isHovered) {
        bg = adjustBrightness(bg, -5); // Pressed state
      }
    }
  }

  // 4. Handle Interaction
  const wasClicked = isHovered && isMouseDown && state.mouseButton === 0;
  const wasActivated =
    isSelected && (state.lastKey === 'enter' || state.lastKey === ' ');

  if (wasClicked || wasActivated) {
    if (props.onClick) props.onClick();
  }

  // 5. Render the Primitive
  const renderLabel = isPill
    ? `${color.fg(bg, '')}${color.bg(bg, color.fg(fg, ` ${isActive ? color.bold(finalLabel) : finalLabel} `))}${color.fg(bg, '')}`
    : color.fg(fg, isActive ? color.bold(finalLabel) : finalLabel);

  return box(
    {
      x: props.x,
      width: w,
      height: h,
      border: filled || isGhost ? 'none' : props.border || 'rounded',
      borderColor: borderCol,
      bgColor: filled && !isPill ? bg : undefined,
      align: props.align || 'center',
      valign: props.valign || 'middle',
      padding: props.padding || [0, isGhost ? 0 : 1],
      detach: props.detach,
    },
    ({ text }) => {
      text(renderLabel);
    },
  );
}
