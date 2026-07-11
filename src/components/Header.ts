import type { BuntiContext } from '../dsl';
import { box as engineBox } from '../layout';
import { Box } from './Box';

/** Props for Header. */
export interface HeaderProps {
  /** Centered bar title. */
  title: string;
  /** Brand glyph on the left edge (use ctx.icon(name)). */
  leftIcon?: string;
  /** Muted telemetry/exit label on the right edge. */
  rightLabel?: string;
  /**
   * @deprecated Colors now derive from `ctx.theme` tokens; wrap the Header
   * in `ctx.themed(...)` to restyle it. This prop is ignored.
   */
  theme?: 'light' | 'dark';
}

/**
 * Enterprise Tactical Header
 * A full-width, high-signal branding bar. Colors derive from ctx.theme:
 * bar `theme.surfaceRaised`, title `theme.foreground`, brand icon
 * `theme.accent`, right label `theme.muted`.
 */
export function Header(ctx: BuntiContext, props: HeaderProps) {
  const { color, joinHorizontal, theme } = ctx;

  const bg = theme.surfaceRaised;
  const fg = theme.foreground;

  // Master Background Box
  Box(
    ctx,
    {
      anchor: 'top',
      width: '100%',
      height: 1,
      bgColor: bg,
      border: 'none',
      padding: [0, 2],
    },
    ({ text, split }) => {
      const [leftArea, midArea, rightArea] = split({
        direction: 'horizontal',
        constraints: [12, '1fr', 12],
      });

      // 1. Left: Branding
      const leftStr = props.leftIcon
        ? color.fg(theme.accent, props.leftIcon)
        : '';
      const leftNode = engineBox(leftStr, {
        width: leftArea?.width ?? 0,
        align: 'left',
        border: 'none',
        padding: [0, 0],
      });

      // 2. Center: Title
      const midStr = color.fg(fg, color.bold(props.title));
      const midNode = engineBox(midStr, {
        width: midArea?.width ?? 0,
        align: 'center',
        border: 'none',
        padding: [0, 0],
      });

      // 3. Right: Telemetry / Exit
      const rightStr = props.rightLabel
        ? color.fg(theme.muted, props.rightLabel)
        : '';
      const rightNode = engineBox(rightStr, {
        width: rightArea?.width ?? 0,
        align: 'right',
        border: 'none',
        padding: [0, 0],
      });

      // Join and push to render pipeline
      text(joinHorizontal(leftNode, midNode, rightNode));
    },
  );
}
