import { adjustBrightness } from '../colors';
import type { BuntiContext, DSLBoxOptions } from '../dsl';
import { visibleWidth } from '../utils';
import { Box } from './Box';

export type CardVariant = 'default' | 'accent' | 'danger';

export interface CardProps extends DSLBoxOptions {
  title?: string;
  /** Visual variant, mapped to theme tokens (border + title color). */
  variant?: CardVariant;
  /** @deprecated Use `variant` — kept as an alias to avoid breaking callers. */
  theme?: CardVariant;
  /**
   * Registers a hitbox and enables the hover affordance: border lifts to
   * theme.focus and the background shifts one step (mode-aware). Without an
   * id the card has no hitbox and behaves exactly as before.
   */
  id?: string;
}

/**
 * Tactical Card Component
 * A structural container with an integrated header. Colors derive from
 * ctx.theme tokens:
 * - default: border `theme.border`, title `theme.muted`
 * - accent:  border `theme.border`, title `theme.accent`
 * - danger:  border `theme.danger`, title `theme.danger`
 *
 * With an `id`, hovering lifts the border to `theme.focus` and shifts the
 * background one step. Hover styling reads the hitbox registered on the
 * previous frame (immediate-mode: geometry is only exact after a render),
 * which is invisible at interactive frame rates.
 */
export function Card(
  ctx: BuntiContext,
  props: CardProps,
  callback: (sub: BuntiContext) => void,
) {
  const { color, theme } = ctx;

  const variant = props.variant ?? props.theme ?? 'default';
  let borderColor: DSLBoxOptions['borderColor'] = theme.border;
  let titleColor: DSLBoxOptions['color'] = theme.muted;

  if (variant === 'accent') {
    titleColor = theme.accent;
  } else if (variant === 'danger') {
    borderColor = theme.danger;
    titleColor = theme.danger;
  }

  // Hover affordance (previous-frame hover state; see docblock).
  const hoverable = props.id !== undefined;
  const hovered = hoverable
    ? (ctx.state.hoverStates.get(props.id!) ?? false)
    : false;
  let bgColor = props.bgColor;
  let finalBorder = props.borderColor || borderColor;
  if (hovered) {
    finalBorder = theme.focus;
    const shift = theme.mode === 'dark' ? 12 : -12;
    bgColor =
      bgColor !== undefined &&
      !(typeof bgColor === 'object' && 'colors' in bgColor)
        ? adjustBrightness(bgColor, shift)
        : (bgColor ?? theme.surface);
  }

  const startY = ctx.cursorY;
  const rendered = Box(
    ctx,
    {
      x: props.x,
      y: props.y,
      anchor: props.anchor,
      width: props.width || '100%',
      height: props.height,
      minHeight: props.minHeight,
      border: props.border || 'frame',
      borderColor: finalBorder,
      padding: props.padding || [1, 2],
      bgColor,
    },
    (sub) => {
      if (props.title) {
        sub.text(
          color.fg(titleColor, color.bold(`${props.title.toUpperCase()}\n\n`)),
        );
      }
      callback(sub);
    },
  );

  if (hoverable) {
    const lines = rendered.split('\n');
    const h = lines.length;
    const w = Math.max(0, ...lines.map(visibleWidth));
    // Mirror resolveBoxArea's placement defaults (centered when unplaced).
    const area = ctx.resolveLocalRect({
      x: props.x,
      y: props.y ?? (startY || undefined),
      width: w,
      height: h,
      anchor: props.anchor,
    });
    ctx.hitbox(props.id!, area);
  }

  return rendered;
}
