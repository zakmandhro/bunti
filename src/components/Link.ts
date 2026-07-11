import { adjustBrightness, type ColorValue, fg } from '../colors';
import type { BuntiContext } from '../dsl';
import { visibleWidth } from '../utils';

export interface LinkProps {
  id: string;
  label: string;
  /** Base color (default theme.accent); brightens on hover (mode-aware). */
  color?: ColorValue;
  onClick?: () => void;
  /** Explicit column (default: current flow cursor). */
  x?: number;
  /** Explicit row (default: current flow cursor). */
  y?: number;
}

/**
 * Inline hyperlink: underlined themed text with a pointer-friendly hitbox.
 * Hover brightens the color one step (mode-aware); clicks fire once per
 * mouse release via the hitbox harness. Appends to the current flow and
 * returns the styled string.
 */
export function Link(ctx: BuntiContext, props: LinkProps): string {
  const width = visibleWidth(props.label);
  const x = props.x ?? ctx.cursorX;
  const y = props.y ?? ctx.cursorY;

  // The label joins the text flow at (x, y), so the hitbox is flow-anchored
  // (re-placed with the painted line by the enclosing box) unless the
  // caller pinned an explicit row.
  const interaction = ctx.hitbox(props.id, {
    x,
    y,
    width,
    height: 1,
    flow: props.y === undefined,
  });
  if (interaction.clicked) props.onClick?.();

  const theme = ctx.theme;
  const base = props.color ?? theme.accent;
  const shift = theme.mode === 'dark' ? 25 : -25;
  const colorNow = interaction.hovered ? adjustBrightness(base, shift) : base;

  // Raw SGR 4/24 (not ctx.color.underline) so underline survives regardless
  // of the vendor formatter's TTY color gate.
  const styled = `\x1b[4m${fg(colorNow, props.label)}\x1b[24m`;

  // When explicitly placed right of the cursor, pad the gap so the flow
  // lands the label on its hitbox.
  const pad =
    props.x !== undefined ? ' '.repeat(Math.max(0, props.x - ctx.cursorX)) : '';
  ctx.text(pad + styled);
  return styled;
}
