import type { BuntiContext } from '../dsl';
import type { StyleOptions } from '../layout';

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
  const { box, color, focusable, state, useState, hitbox } = ctx;

  // 1. Mouse Hit-Testing
  const w = props.width || 40;
  const h = props.height || 3;
  const labelOffset = props.label ? 1 : 0;

  const interaction = hitbox(props.id, {
    y: ctx.cursorY + labelOffset,
    width: w as number,
    height: h as number,
  });
  const isHovered = interaction.hovered;

  // If clicked, force focus state
  if (interaction.pressed) {
    state.focusedId = props.id;
  }

  // 2. Register in the global focus loop
  const isSelected = focusable(props.id);

  // 3. Manage internal state
  const [value, setValue] = useState(props.id, props.value || '');

  // 4. Handle Keyboard Interaction (only when focused)
  if (isSelected && state.lastKey) {
    const key = state.lastKey;

    if (key === 'backspace') {
      if (value.length > 0) {
        const newValue = value.slice(0, -1);
        setValue(newValue);
        if (props.onChange) props.onChange(newValue);
      }
    } else if (
      key === 'enter' ||
      key === 'tab' ||
      key === 'escape' ||
      key === 'up' ||
      key === 'down' ||
      key === 'left' ||
      key === 'right'
    ) {
      // System keys: ignore
    } else if (key.length === 1) {
      // Standard character input
      const newValue = value + key;
      setValue(newValue);
      if (props.onChange) props.onChange(newValue);
    }
  }

  // 5. Resolve Theme
  const neutralGray = { r: 217, g: 216, b: 213 };
  const borderCol = isSelected ? 'bunti-blue' : isHovered ? 'ash' : neutralGray;
  const labelColor = 'silver';
  const placeholderColor = 'ash';
  const textColor = 'white';

  let fieldValue = '';
  if (value.length === 0 && props.placeholder) {
    fieldValue = color.fg(placeholderColor, props.placeholder);
  } else {
    const displayValue =
      props.type === 'password' ? '*'.repeat(value.length) : value;
    fieldValue = color.fg(textColor, displayValue);
  }
  if (isSelected) {
    fieldValue += color.fg('silver', '█');
  }

  const field = box(
    {
      width: w,
      height: h,
      border: 'rounded',
      borderColor: borderCol,
      padding: [0, 1],
      align: 'left',
      valign: 'middle',
      detach: true,
    },
    ({ text }) => text(fieldValue),
  );

  if (props.label) {
    ctx.text(color.fg(labelColor, props.label));
    ctx.text('\n');
  }
  ctx.text(field);
  return field;
}
