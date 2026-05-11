import { BuntiContext } from "../dsl";
import { StyleOptions } from "../layout";

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
  const { box, color, focusable, state, offsetX, offsetY, mouseX, mouseY, isMouseDown } = ctx;
  
  // 1. Register in the global focus loop (for TAB navigation)
  const isSelected = focusable(props.id);
  
  // 2. Resolve final dimensions to perform Mouse Hit-Testing
  const finalLabel = props.icon ? `${props.icon} ${props.label}` : props.label;
  const w = props.width || Math.max(12, finalLabel.length + 4);
  const h = props.height || 3;
  
  // Hit Testing: 100% width buttons use just offsetX. 
  // Inline buttons would need cursorX, but typically they are centered by the parent layout phase.
  // For standard form buttons (100% width or single column), using offsetX + center math works.
  // If button is 100% width, absX = offsetX. If centered, absX = offsetX + (ctx.width - w) / 2
  const absX = props.width === '100%' ? offsetX : offsetX + Math.max(0, Math.floor((ctx.width - (w as number)) / 2));
  const absY = offsetY + ctx.cursorY;

  const isHovered = mouseX >= absX && mouseX < absX + (w as number) &&
                    mouseY >= absY && mouseY < absY + (h as number);

  // 3. Resolve Theme & State
  let bg: any = 'ocean';
  let fg: any = 'silver';
  let borderCol: any = color.lighten('ocean', 20);
  
  if (props.variant === 'primary') {
    bg = 'bunti-blue';
    borderCol = color.lighten('bunti-blue', 20);
  } else if (props.variant === 'danger') {
    bg = 'error';
    borderCol = color.lighten('error', 20);
  }

  // Active Interactive State
  const isActive = isSelected || isHovered;

  if (isActive) {
    borderCol = 'plasma';
    fg = 'white';
    if (isMouseDown && isHovered) {
       bg = color.darken(bg, 20); // Pressed state
    } else {
       if (ctx.flicker(0.95)) bg = color.lighten(bg, 15); // Pulsing hover/focus
    }
  }

  // 4. Handle Interaction
  const wasClicked = (isHovered && isMouseDown && state.mouseButton === 0);
  const wasActivated = isSelected && (state.lastKey === 'enter' || state.lastKey === ' ');

  if (wasClicked || wasActivated) {
    if (props.onClick) props.onClick();
  }

  // 5. Render the Primitive
  return box({
    width: w,
    height: h,
    border: props.border || 'rounded',
    borderColor: borderCol,
    bgColor: bg,
    align: props.align || 'center',
    valign: props.valign || 'middle',
    padding: props.padding || [0, 1]
  }, ({ text }) => {
    text(color.fg(fg, isActive ? color.bold(finalLabel) : finalLabel));
  });
}
