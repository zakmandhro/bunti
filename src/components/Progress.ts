import { type ColorValue, createGradient } from '../colors';
import type { BuntiContext } from '../dsl';
import { clamp01 } from '../easing';

export interface ProgressProps {
  /** Fill fraction 0..1 (clamped). */
  value: number;
  /** Bar width in cells (default 20). */
  width?: number;
  /** Multi-stop gradient fill: per-cell colors across the full bar. */
  gradient?: ColorValue[];
  /** Solid fill color (default theme.primary; ignored with gradient). */
  fillColor?: ColorValue;
  /** Track (unfilled) color (default theme.border). */
  trackColor?: ColorValue;
  /** Fill glyph (default '█'). */
  filledChar?: string;
  /** Track glyph (default '░'). */
  trackChar?: string;
  /** Appends a percent readout after the bar. */
  showPercent?: boolean;
}

/**
 * Themed progress bar: theme.primary fill over a theme.border track, with
 * optional per-cell gradient fill. Appends to the current flow and returns
 * the styled string.
 */
export function Progress(ctx: BuntiContext, props: ProgressProps): string {
  const theme = ctx.theme;
  const width = Math.max(1, Math.floor(props.width ?? 20));
  const value = clamp01(props.value);
  const filled = Math.round(width * value);
  const filledChar = props.filledChar ?? '█';
  const trackChar = props.trackChar ?? '░';

  let bar = '';
  if (filled > 0) {
    if (props.gradient && props.gradient.length > 0) {
      // Gradient spans the FULL bar so the fill's leading edge shows the
      // stop for its position, not a compressed whole gradient.
      const stops = createGradient(props.gradient, width);
      for (let i = 0; i < filled; i++) {
        bar += ctx.color.fg(stops[i]!, filledChar);
      }
    } else {
      bar = ctx.color.fg(
        props.fillColor ?? theme.primary,
        filledChar.repeat(filled),
      );
    }
  }

  const track =
    width - filled > 0
      ? ctx.color.fg(
          props.trackColor ?? theme.border,
          trackChar.repeat(width - filled),
        )
      : '';

  const percent = props.showPercent
    ? ` ${String(Math.round(value * 100)).padStart(3)}%`
    : '';

  const out = bar + track + percent;
  ctx.text(out);
  return out;
}
