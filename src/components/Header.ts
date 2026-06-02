import type { BuntiContext } from '../dsl';
import { box as engineBox } from '../layout';

export interface HeaderProps {
  title: string;
  leftIcon?: string;
  rightLabel?: string;
  theme?: 'light' | 'dark';
}

/**
 * Enterprise Tactical Header
 * A full-width, high-signal branding bar.
 */
export function Header(ctx: BuntiContext, props: HeaderProps) {
  const { box, color, width, joinHorizontal } = ctx;

  // Resolve Theme Colors
  const isLight = props.theme !== 'dark';
  const bg = isLight ? 'white' : 'midnight';
  const fg = isLight ? 236 : 'silver';

  // Master Background Box
  box(
    {
      anchor: 'top',
      width: '100%',
      height: 1,
      bgColor: bg,
      border: 'none',
      padding: [0, 2],
    },
    ({ text }) => {
      // 1. Left: Branding
      const leftStr = props.leftIcon ? color.fg('plasma', props.leftIcon) : '';
      const leftNode = engineBox(leftStr, {
        width: 12,
        align: 'left',
        border: 'none',
        padding: [0, 0],
      });

      // 2. Center: Title
      const midStr = color.fg(fg, color.bold(props.title));
      const midNode = engineBox(midStr, {
        width: width - 28,
        align: 'center',
        border: 'none',
        padding: [0, 0],
      });

      // 3. Right: Telemetry / Exit
      const rightStr = props.rightLabel ? color.dim(props.rightLabel) : '';
      const rightNode = engineBox(rightStr, {
        width: 12,
        align: 'right',
        border: 'none',
        padding: [0, 0],
      });

      // Join and push to render pipeline
      text(joinHorizontal(leftNode, midNode, rightNode));
    },
  );
}
