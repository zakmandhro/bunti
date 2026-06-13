import type { BuntiContext, DSLBoxOptions } from '../dsl';

export interface BoxProps extends DSLBoxOptions {}

export function Box(
  ctx: BuntiContext,
  props: BoxProps,
  callback: (sub: BuntiContext) => void,
) {
  return ctx.box(props, callback);
}
