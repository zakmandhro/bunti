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
  const { box, color, focusable, state, hitbox } = ctx;

  // 1. Register in the global focus loop (for TAB navigation)
  const isSelected = focusable(props.id);

  // 2. Resolve final dimensions to perform Mouse Hit-Testing
  const finalLabel = props.icon ? `${props.icon} ${props.label}` : props.label;
  const isGhost = props.variant === 'ghost';
  const isPill = props.variant === 'primary';
  const filled = isPill || props.variant === 'danger';
  const contentWidth = Math.max(12, finalLabel.length + (isPill ? 6 : 4));
  const contentHeight = filled || isGhost ? 1 : 3;
  const w = props.width ?? contentWidth;
  const h = props.height ?? contentHeight;

  const resolvedW = ctx.measureWidth(w, contentWidth);
  const resolvedH = ctx.measureHeight(h, contentHeight);
  const relativeX =
    props.x !== undefined
      ? props.x
      : props.width === '100%'
        ? 0
        : Math.max(0, Math.floor((ctx.width - resolvedW) / 2));
  const relativeY = props.y ?? ctx.cursorY;
  const interaction = hitbox(props.id, {
    x: relativeX,
    y: relativeY,
    width: resolvedW,
    height: resolvedH,
  });
  const isHovered = interaction.hovered;
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
      if (interaction.pressed) {
        bg = adjustBrightness(bg, -5); // Pressed state
      }
    }
  }

  // 4. Handle Interaction
  const wasClicked = interaction.pressed;
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
      x: relativeX,
      y: relativeY,
      width: resolvedW,
      height: resolvedH,
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
