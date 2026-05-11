import { BuntiContext } from "../dsl";
import { StyleOptions } from "../layout";

export interface InputProps extends StyleOptions {
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'password';
  onChange?: (value: string) => void;
}

/**
 * Tactical Input Component
 * Managed state HOC with cursor simulation, keyboard interception, and mouse focus.
 */
export function Input(ctx: BuntiContext, props: InputProps) {
  const { box, color, focusable, state, useState, offsetX, offsetY, mouseX, mouseY, isMouseDown } = ctx;

  // 1. Mouse Hit-Testing
  const finalLabelLen = props.label ? props.label.length + 1 : 0;
  const w = props.width || 40;
  const h = props.height || 3;
  
  // Calculate absolute coordinates based on parent offsets and current flow cursor
  // Assuming 100% width, x offset is just parent's offsetX.
  const absX = offsetX; 
  const absY = offsetY + ctx.cursorY;

  const isHovered = mouseX >= absX && mouseX < absX + (w as number) &&
                    mouseY >= absY && mouseY < absY + (h as number);

  // If clicked, force focus state
  if (isHovered && isMouseDown && state.mouseButton === 0) {
     state.focusedId = props.id;
  }

  // 2. Register in the global focus loop
  const isSelected = focusable(props.id);

  // 3. Manage internal state
  const [value, setValue] = useState(props.id, props.value || "");

  // 4. Handle Keyboard Interaction (only when focused)
  if (isSelected && state.lastKey) {
    const key = state.lastKey;
    
    if (key === 'backspace') {
      if (value.length > 0) {
        const newValue = value.slice(0, -1);
        setValue(newValue);
        if (props.onChange) props.onChange(newValue);
      }
    } else if (key === 'enter' || key === 'tab') {
      // Let global focus loop handle it
    } else if (key.length === 1) {
      // Standard character input
      const newValue = value + key;
      setValue(newValue);
      if (props.onChange) props.onChange(newValue);
    }
  }

  // 5. Resolve Theme
  const borderCol = isSelected ? 'plasma' : (isHovered ? 'cyan' : color.dim);
  const bgColor = isSelected ? 234 : 233;
  const textColor = isSelected ? 'white' : 'silver';

  // 6. Render
  return box({
    width: w,
    height: h,
    border: 'frame',
    borderColor: borderCol,
    bgColor: bgColor,
    padding: [0, 1],
    align: 'left',
    valign: 'middle'
  }, ({ text }) => {
    // Label
    if (props.label) {
      text(color.dim(props.label + " "));
    }

    // Value Display with simulated cursor
    if (value.length === 0 && props.placeholder) {
      text(color.dim(props.placeholder));
    } else {
      const displayValue = props.type === 'password' ? '*'.repeat(value.length) : value;
      text(color.fg(textColor, displayValue));
    }

    // Cursor (blinking)
    if (isSelected && ctx.flicker(0.8)) {
      text(color.fg('plasma', "█"));
    }
  });
}
