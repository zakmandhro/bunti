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
  if (targetWidth <= 0) return '';

  let currentWidth = 0;
  let out = '';
  
  // Custom parsing loop to isolate ANSI sequences from text
  const regex = /\x1B\[[0-9;]*[a-zA-Z]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    // 1. Process text before the ANSI code
    const textSegment = str.substring(lastIndex, match.index);
    if (textSegment.length > 0) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      // @ts-ignore
      for (const { segment } of segmenter.segment(textSegment)) {
        const w = charWidth(segment);
        if (currentWidth + w > targetWidth) {
          return out + '\x1b[0m' + tail; // Return immediately upon hitting limit
        }
        out += segment;
        currentWidth += w;
      }
    }

    // 2. Append the ANSI code itself (zero width)
    out += match[0];
    lastIndex = regex.lastIndex;
  }

  // 3. Process remaining text after the last ANSI code
  const remainingText = str.substring(lastIndex);
  if (remainingText.length > 0) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    // @ts-ignore
    for (const { segment } of segmenter.segment(remainingText)) {
      const w = charWidth(segment);
      if (currentWidth + w > targetWidth) {
        return out + '\x1b[0m' + tail;
      }
      out += segment;
      currentWidth += w;
    }
  }

  return out + '\x1b[0m';
}

/**
 * Wraps text to a specific visible width, preserving ANSI codes.
 * Implements word-based wrapping with fallback to char-breaking for long tokens.
 */
export function wrapText(str: string, width: number): string[] {
  if (width <= 0) return [str];
  const result: string[] = [];
  const rawLines = str.split('\n');

  for (const rawLine of rawLines) {
    if (visibleWidth(rawLine) <= width) {
      result.push(rawLine);
      continue;
    }

    // Split into tokens: words and whitespaces
    const tokens = rawLine.split(/(\s+)/).filter(t => t.length > 0);
    let currentLine = '';
    let currentWidth = 0;

    for (const token of tokens) {
      const tokenWidth = visibleWidth(token);
      const isWhitespace = /^\s+$/.test(stripAnsi(token));

      // If token itself is too wide, we MUST break it by character
      if (tokenWidth > width) {
        // Flush current line if it exists
        if (currentLine) {
          result.push(currentLine + '\x1b[0m');
          currentLine = '';
          currentWidth = 0;
        }

        // Segmented break of the long token
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        // @ts-ignore
        for (const { segment } of segmenter.segment(token)) {
          const sw = charWidth(segment);
          if (currentWidth + sw > width) {
            result.push(currentLine + '\x1b[0m');
            currentLine = segment;
            currentWidth = sw;
          } else {
            currentLine += segment;
            currentWidth += sw;
          }
        }
        continue;
      }

      // Normal word wrap
      if (currentWidth + tokenWidth > width) {
        if (isWhitespace) {
          // Swallow leading whitespace on new lines
          continue;
        }
        result.push(currentLine.trimEnd() + '\x1b[0m');
        currentLine = token;
        currentWidth = tokenWidth;
      } else {
        currentLine += token;
        currentWidth += tokenWidth;
      }
    }
    if (currentLine) result.push(currentLine.trimEnd());
  }

  return result;
}

/**
 * Identity function.
 */
export function replaceEmojis(str: string): string {
  return str;
}
