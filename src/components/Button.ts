import { adjustBrightness, contrastText } from '../colors';
import type { BuntiContext, DSLBoxOptions } from '../dsl';
import type { RGB } from '../state';
import type { ThemeColor } from '../theme';
import { indentBlock } from '../utils';

type ButtonColor = string | number | RGB | ThemeColor | undefined;

/** Props for Button. */
export interface ButtonProps extends DSLBoxOptions {
  /** Stable id: keys the hitbox, Tab-focus slot, and hover state. */
  id: string;
  /** Button text. */
  label: string;
  /** Glyph rendered before the label (use ctx.icon(name)). */
  icon?: string;
  /**
   * Visual style, mapped to theme tokens: 'primary' = filled pill,
   * 'danger' = filled red, 'ghost' = borderless text, default = outlined.
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Fires once per activation (mouse click release, Enter, or Space). */
  onClick?: () => void;
}

/**
 * Themed push button: Tab-focusable, hover/press styled from ctx.theme
 * tokens, activated by click, Enter, or Space (onClick fires once).
 * @example Button(ctx, { id: 'go', label: 'Deploy', variant: 'primary', onClick: deploy });
 */
export function Button(ctx: BuntiContext, props: ButtonProps) {
  const { box, color, focusable, state, hitbox, resolveLocalRect } = ctx;

  // 1. Register in the global focus loop (for TAB navigation)
  const isSelected = focusable(props.id);

  // 2. Resolve final dimensions to perform Mouse Hit-Testing
  const finalLabel = props.icon ? `${props.icon} ${props.label}` : props.label;
  const isGhost = props.variant === 'ghost';
  const isPill = props.variant === 'primary';
  const filled = isPill || props.variant === 'danger';
  const contentWidth = Math.max(12, finalLabel.length + (isPill ? 6 : 4));
  const contentHeight = filled || isGhost ? 1 : 3;
  const area = resolveLocalRect({
    x: props.x,
    y: props.y ?? ctx.cursorY,
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
  const isActive = isSelected || isHovered;

  // 3. Resolve Theme & State — every color derives from ctx.theme tokens so
  // a live theme swap restyles the button. Hover/pressed shifts are
  // mode-aware: brighten on dark themes, darken on light themes.
  const theme = ctx.theme;
  const shiftDir = theme.mode === 'dark' ? 1 : -1;
  const hover = (base: ButtonColor) => adjustBrightness(base, 15 * shiftDir);
  const press = (base: ButtonColor) => adjustBrightness(base, 30 * shiftDir);

  let bg: ButtonColor = theme.surface;
  let fg: ButtonColor = theme.foreground;
  let borderCol: ButtonColor = theme.border;

  if (props.variant === 'primary') {
    bg = isActive ? hover(theme.primary) : theme.primary;
    if (interaction.pressed) bg = press(theme.primary);
    fg = theme.onPrimary;
    borderCol = bg;
  } else if (props.variant === 'danger') {
    bg = isActive ? hover(theme.danger) : theme.danger;
    if (interaction.pressed) bg = press(theme.danger);
    fg = contrastText(bg);
    borderCol = bg;
  } else if (isGhost) {
    bg = undefined;
    fg = isActive ? hover(theme.foreground) : theme.foreground;
  } else if (isActive) {
    // Default variant: focus ring + mode-aware surface shift.
    borderCol = theme.focus;
    bg = interaction.pressed ? press(theme.surface) : hover(theme.surface);
  }
  if (isSelected && props.variant !== 'primary' && !isGhost) {
    borderCol = theme.focus; // Keyboard focus ring
  }

  // 4. Handle Interaction — clicks fire once, on mouse release at the
  // press origin (interaction.pressed would repeat every held frame).
  const wasClicked = interaction.clicked;
  const wasActivated =
    isSelected && (state.lastKey === 'enter' || state.lastKey === ' ');

  if (wasClicked || wasActivated) {
    if (props.onClick) props.onClick();
  }

  // 5. Render the Primitive
  const renderLabel = isPill
    ? `${color.fg(bg, '')}${color.bg(bg, color.fg(fg, ` ${isActive ? color.bold(finalLabel) : finalLabel} `))}${color.fg(bg, '')}`
    : color.fg(fg, isActive ? color.bold(finalLabel) : finalLabel);

  const rendered = box(
    {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      border: filled || isGhost ? 'none' : props.border || 'rounded',
      borderColor: borderCol,
      bgColor: isPill || isGhost ? undefined : bg,
      align: props.align || 'center',
      valign: props.valign || 'middle',
      padding: props.padding || [0, isGhost ? 0 : 1],
      detach: props.detach,
    },
    ({ text }) => {
      text(renderLabel);
    },
  );
  return !ctx.isRoot && props.detach && props.x === undefined
    ? indentBlock(rendered, area.x)
    : rendered;
}
