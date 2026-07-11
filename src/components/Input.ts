import type { BuntiContext } from '../dsl';
import type { StyleOptions } from '../layout';
import { indentBlock } from '../utils';

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
  const { box, color, focusable, state, useState, hitbox, resolveLocalRect } =
    ctx;

  // 1. Mouse Hit-Testing
  const contentWidth = 40;
  const contentHeight = 3;
  const labelOffset = props.label ? 1 : 0;
  const area = resolveLocalRect({
    y: ctx.cursorY + labelOffset,
    width: props.width ?? contentWidth,
    height: props.height ?? contentHeight,
    contentWidth,
    contentHeight,
  });

  const interaction = hitbox(props.id, {
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
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

  // 5. Resolve Theme — all colors come from ctx.theme tokens so the field
  // restyles on live theme swaps.
  const theme = ctx.theme;
  const borderCol = isSelected
    ? theme.focus
    : isHovered
      ? theme.muted
      : theme.border;
  const labelColor = theme.foreground;
  const placeholderColor = theme.muted;
  const textColor = theme.foreground;

  let fieldValue = '';
  if (value.length === 0 && props.placeholder) {
    fieldValue = color.fg(placeholderColor, props.placeholder);
  } else {
    const displayValue =
      props.type === 'password' ? '*'.repeat(value.length) : value;
    fieldValue = color.fg(textColor, displayValue);
  }
  if (isSelected) {
    fieldValue += color.fg(theme.foreground, '█');
  }

  const field = box(
    {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      border: 'rounded',
      borderColor: borderCol,
      bgColor: theme.surface,
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
  const renderedField = ctx.isRoot ? field : indentBlock(field, area.x);
  if (!ctx.isRoot) {
    ctx.text(renderedField);
  }
  return renderedField;
}
