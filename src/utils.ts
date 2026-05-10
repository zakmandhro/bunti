/**
 * Bunti Utility Suite - Bun-Native High Performance Edition
 */

/**
 * Strips ANSI escape sequences from a string to allow accurate width measurement.
 */
export function stripAnsi(str: string): string {
  if (!str) return '';
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Calculates the visible width of a string using Bun's SIMD-optimized API.
 * Handles multi-line strings and multi-byte characters correctly.
 */
export function visibleWidth(str: string): number {
  if (!str) return 0;
  const lines = str.split('\n');
  if (lines.length > 1) {
    return Math.max(...lines.map(visibleWidth));
  }
  
  // @ts-ignore
  return Bun.stringWidth(stripAnsi(str));
}

/**
 * Returns the width of a single character or grapheme.
 */
export function charWidth(char: string): number {
  const clean = stripAnsi(char);
  if (clean.length === 0) return 0;
  // @ts-ignore
  return Bun.stringWidth(clean);
}

/**
 * Truncates a string to a visible width while preserving ANSI codes.
 * Uses Intl.Segmenter to ensure graphemes are not sliced.
 */
export function truncate(str: string, width: number, tail = '…'): string {
  const visible = visibleWidth(str);
  if (visible <= width) return str;

  const targetWidth = width - visibleWidth(tail);
  let currentWidth = 0;
  let out = '';
  
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  // @ts-ignore
  for (const { segment } of segmenter.segment(str)) {
    const clean = stripAnsi(segment);
    if (clean.length === 0 && segment.length > 0) {
      out += segment;
      continue;
    }

    const w = charWidth(clean);
    if (currentWidth + w > targetWidth) break;
    
    out += segment;
    currentWidth += w;
  }

  return out + tail + '\x1b[0m';
}
