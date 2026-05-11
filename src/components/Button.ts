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
  // Note: We're doing a simplified hit-test based on absolute screen coordinates.
  const finalLabel = props.icon ? `${props.icon} ${props.label}` : props.label;
  const w = props.width || Math.max(12, finalLabel.length + 4);
  const h = props.height || 3;
  
  // We need to know where this box will land. 
  // In the demo, we are using flow layout, but HOCs in Phase 2 should know their parent offsets.
  const isHovered = mouseX >= offsetX && mouseX < offsetX + (w as number) &&
                    mouseY >= offsetY && mouseY < offsetY + (h as number);

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
