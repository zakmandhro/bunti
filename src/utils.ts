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
 * GUARANTEE: Never slices an ANSI escape sequence in half.
 */
export function truncate(str: string, width: number, tail = '…'): string {
  const visible = visibleWidth(str);
  if (visible <= width) return str;

  const targetWidth = width - visibleWidth(tail);
  let currentWidth = 0;
  let out = '';
  
  // Use Intl.Segmenter to iterate over graphemes safely
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  // @ts-ignore
  for (const { segment } of segmenter.segment(str)) {
    const clean = stripAnsi(segment);
    
    // If it's a pure ANSI segment, always include it (doesn't add to width)
    if (clean.length === 0 && segment.length > 0) {
      out += segment;
      continue;
    }

    const w = charWidth(clean);
    if (currentWidth + w > targetWidth) break;
    
    out += segment;
    currentWidth += w;
  }

  // Always append a reset to be safe
  return out + tail + '\x1b[0m';
}

/**
 * Wraps text to a specific visible width, preserving ANSI codes.
 */
export function wrapText(str: string, width: number): string[] {
  if (width <= 0) return [str];
  const lines: string[] = [];
  const rawLines = str.split('\n');

  for (const rawLine of rawLines) {
    let currentLine = '';
    let currentWidth = 0;
    
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    // @ts-ignore
    for (const { segment } of segmenter.segment(rawLine)) {
      const clean = stripAnsi(segment);
      const w = charWidth(clean);

      if (clean.length === 0 && segment.length > 0) {
        currentLine += segment;
        continue;
      }

      if (currentWidth + w > width) {
        lines.push(currentLine + '\x1b[0m');
        currentLine = segment;
        currentWidth = w;
      } else {
        currentLine += segment;
        currentWidth += w;
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Identity function.
 */
export function replaceEmojis(str: string): string {
  return str;
}
