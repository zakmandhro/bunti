import type { BuntiContext, DSLBoxOptions } from '../dsl';
import { Box } from './Box';

export type CardVariant = 'default' | 'accent' | 'danger';

export interface CardProps extends DSLBoxOptions {
  title?: string;
  /** Visual variant, mapped to theme tokens (border + title color). */
  variant?: CardVariant;
  /** @deprecated Use `variant` — kept as an alias to avoid breaking callers. */
  theme?: CardVariant;
}

/**
 * Tactical Card Component
 * A structural container with an integrated header. Colors derive from
 * ctx.theme tokens:
 * - default: border `theme.border`, title `theme.muted`
 * - accent:  border `theme.border`, title `theme.accent`
 * - danger:  border `theme.danger`, title `theme.danger`
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

  return Box(
    ctx,
    {
      x: props.x,
      y: props.y,
      anchor: props.anchor,
      width: props.width || '100%',
      height: props.height,
      minHeight: props.minHeight,
      border: props.border || 'frame',
      borderColor: props.borderColor || borderColor,
      padding: props.padding || [1, 2],
      bgColor: props.bgColor,
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
}
