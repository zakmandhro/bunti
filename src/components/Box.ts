import type { BuntiContext, DSLBoxOptions } from '../dsl';

/** Props for Box — identical to ctx.box() options. */
export interface BoxProps extends DSLBoxOptions {}

/**
 * Component-style alias for ctx.box(): draws a styled box and renders the
 * callback inside its padded interior. Returns the rendered string.
 * @example Box(ctx, { width: 40, border: 'rounded' }, (s) => s.text('hi'));
 */
export function Box(
  ctx: BuntiContext,
  props: BoxProps,
  callback: (sub: BuntiContext) => void,
) {
  return ctx.box(props, callback);
}
