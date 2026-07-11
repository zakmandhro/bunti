import type { ColorValue } from '../colors';
import type { BuntiContext } from '../dsl';

/** Braille spinner animation frames, in playback order. */
export const SPINNER_FRAMES = [
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏',
] as const;

export interface SpinnerProps {
  /** Text rendered after the spinner glyph. */
  label?: string;
  /** Glyph color (default theme.accent). */
  color?: ColorValue;
  /** Milliseconds per animation frame (default 80). */
  intervalMs?: number;
}

/**
 * Animated braille spinner driven by ctx.elapsedTime — stateless, so it
 * animates for free on any render loop. Appends to the current flow and
 * returns the styled string.
 */
export function Spinner(ctx: BuntiContext, props: SpinnerProps = {}): string {
  const interval = Math.max(1, props.intervalMs ?? 80);
  const frame =
    SPINNER_FRAMES[
      Math.floor(ctx.elapsedTime / interval) % SPINNER_FRAMES.length
    ]!;
  const glyph = ctx.color.fg(props.color ?? ctx.theme.accent, frame);
  const out = props.label ? `${glyph} ${props.label}` : glyph;
  ctx.text(out);
  return out;
}
