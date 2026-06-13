import { adjustBrightness } from '../colors';
import type { BuntiContext } from '../dsl';
import type { StyleOptions } from '../layout';

export interface ButtonProps extends StyleOptions {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
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
  const w = props.width || Math.max(12, finalLabel.length + 4);
  const h = props.height || 3;

  const resolvedW = typeof w === 'number' ? w : ctx.width;
  const absX =
    props.width === '100%'
      ? offsetX
      : offsetX + Math.max(0, Math.floor((ctx.width - resolvedW) / 2));
  const absY = offsetY + ctx.cursorY;

  const isHovered =
    mouseX >= absX &&
    mouseX < absX + resolvedW &&
    mouseY >= absY &&
    mouseY < absY + (h as number);

  // 3. Resolve Theme & State
  let bg: any = 254; // Near white
  let fg: any = 'black';
  let borderCol: any = { r: 217, g: 216, b: 213 };

  if (props.variant === 'primary') {
    bg = 'black';
    fg = 'white';
    borderCol = 'black';
  } else if (props.variant === 'danger') {
    bg = 'error';
    borderCol = adjustBrightness('error', 20);
    fg = 'white';
  }

  // Active Interactive State
  const isActive = isSelected || isHovered;

  if (isActive) {
    if (props.variant === 'primary') {
      bg = 'ash'; // Hover state for primary
    } else {
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
  return box(
    {
      width: w,
      height: h,
      border: props.variant === 'primary' ? 'none' : props.border || 'rounded',
      borderColor: borderCol,
      bgColor: bg,
      align: props.align || 'center',
      valign: props.valign || 'middle',
      padding: props.padding || [0, 1],
    },
    ({ text }) => {
      text(color.fg(fg, isActive ? color.bold(finalLabel) : finalLabel));
    },
  );
}
