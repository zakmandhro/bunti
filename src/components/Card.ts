import type { BuntiContext, DSLBoxOptions } from '../dsl';

export interface CardProps extends DSLBoxOptions {
  title?: string;
  theme?: 'default' | 'accent' | 'danger';
}

/**
 * Tactical Card Component
 * A structural container with an integrated header.
 */
export function Card(
  ctx: BuntiContext,
  props: CardProps,
  callback: (sub: BuntiContext) => void,
) {
  const { box, color } = ctx;

  const neutralGray = { r: 217, g: 216, b: 213 };
  let borderColor: any = neutralGray;
  let titleColor: any = neutralGray;

  if (props.theme === 'accent') {
    titleColor = 'black';
    // Border remains neutral gray
  } else if (props.theme === 'danger') {
    borderColor = 'error';
    titleColor = 'error';
  }

  return box(
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
