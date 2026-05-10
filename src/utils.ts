/**
 * Bunti Utility Suite - Bun-Native High Performance Edition
 */

/**
 * Strips ANSI escape sequences from a string.
 */
export function stripAnsi(str: string): string {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~]*)*)?|[\u0007\u001b\u009b\\]/g, '');
}

/**
 * Calculates the visible width of a string.
 * Leverages Bun's native SIMD-optimized stringWidth API.
 */
export function visibleWidth(str: string): number {
  if (str.length === 0) return 0;
  const lines = str.split('\n');
  if (lines.length > 1) {
    return Math.max(...lines.map(visibleWidth));
  }
  
  // @ts-ignore
  return Bun.stringWidth(str);
}

/**
 * Truncates a string to a visible width while preserving ANSI codes.
 */
export function truncate(str: string, width: number, tail = '…'): string {
  const visible = visibleWidth(str);
  if (visible <= width) return str;

  const tailWidth = visibleWidth(tail);
  const targetWidth = width - tailWidth;

  let currentWidth = 0;
  let out = '';
  
  // Use Intl.Segmenter to iterate over graphemes
  // @ts-ignore
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  for (const { segment } of segmenter.segment(str)) {
    // If it's an ANSI escape sequence, don't count its width
    const clean = stripAnsi(segment);
    if (clean.length === 0 && segment.length > 0) {
      out += segment;
      continue;
    }

    // @ts-ignore
    const w = Bun.stringWidth(clean);
    if (currentWidth + w > targetWidth) break;
    
    out += segment;
    currentWidth += w;
  }

  return out + tail + '\x1b[0m';
}
