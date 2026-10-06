/**
 * Bunti Utility Suite - Bun-Native High Performance Edition
 */

/**
 * Strips ANSI escape sequences from a string to allow accurate width measurement.
 */
export function stripAnsi(str: string): string {
  if (!str || str.indexOf('\x1B') === -1) return str || '';
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

let segmenter: Intl.Segmenter | null = null;

function getSegmenter(): Intl.Segmenter {
  if (!segmenter) {
    segmenter = new Intl.Segmenter();
  }
  return segmenter;
}

function graphemeWidth(segment: string): number {
  if (segment.length === 1) {
    const cp = segment.charCodeAt(0);
    if (cp >= 0x20 && cp <= 0x7e) return 1;
    if (cp <= 0x1f || cp === 0x7f) return 0;
  }
  const cp = segment.codePointAt(0);
  if (cp === undefined) return 0;

  // Zero-width control codes and format characters
  if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) return 0;
  if (cp === 0x200b || cp === 0xfeff || cp === 0xad) return 0; // zero-width space, BOM, soft hyphen

  // Emoji / Extended Pictographic (Intl.Segmenter groups whole emoji grapheme clusters)
  if (/\p{Extended_Pictographic}/u.test(segment)) {
    return 2;
  }

  // East Asian Wide / Fullwidth characters
  if (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) || // CJK Radicals, Kangxi, Ideographic, Hiragana, Katakana, Bopomofo, Hangul, CJK Unified
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe10 && cp <= 0xfe19) || // Vertical forms
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK Compatibility Forms
    (cp >= 0xff01 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth signs
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Unified Ideographs Extension
  ) {
    return 2;
  }

  // Combining characters
  if (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  ) {
    return 0;
  }

  return 1;
}

/**
 * Calculates string width using Intl.Segmenter and Unicode tables when Bun.stringWidth is unavailable.
 */
export function stringWidthFallback(str: string): number {
  if (!str) return 0;
  const clean = str.indexOf('\x1B') !== -1 ? stripAnsi(str) : str;
  let isAscii = true;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) return clean.length;

  const seg = getSegmenter();
  let width = 0;
  for (const { segment } of seg.segment(clean)) {
    width += graphemeWidth(segment);
  }
  return width;
}

/**
 * Calculates the visible width of a string (using Bun's SIMD API when on Bun,
 * falling back to Intl.Segmenter unicode width on Node).
 */
export function visibleWidth(str: string): number {
  if (!str) return 0;
  const lines = str.split('\n');
  if (lines.length > 1) {
    return Math.max(...lines.map(visibleWidth));
  }

  // Fast path for printable ASCII (no escape codes, control codes, or wide chars)
  let isAscii = true;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) return str.length;

  const clean = stripAnsi(str);
  if (typeof Bun !== 'undefined' && typeof Bun.stringWidth === 'function') {
    return Bun.stringWidth(clean);
  }

  return stringWidthFallback(clean);
}

/**
 * Returns the width of a single character or grapheme.
 */
export function charWidth(char: string): number {
  if (char.length === 1) {
    const code = char.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) return 1;
    if (code <= 0x1f || code === 0x7f) return 0;
  }
  const clean = stripAnsi(char);
  if (clean.length === 0) return 0;
  if (clean.length === 1) {
    const code = clean.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) return 1;
    if (code <= 0x1f || code === 0x7f) return 0;
  }
  if (typeof Bun !== 'undefined' && typeof Bun.stringWidth === 'function') {
    return Bun.stringWidth(clean);
  }
  return stringWidthFallback(clean);
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
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(str)) !== null) {
    // 1. Process text before the ANSI code
    const textSegment = str.substring(lastIndex, match.index);
    if (textSegment.length > 0) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      for (const { segment } of segmenter.segment(textSegment)) {
        const w = charWidth(segment);
        if (currentWidth + w > targetWidth) {
          return `${out}\x1b[0m${tail}`; // Return immediately upon hitting limit
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
    for (const { segment } of segmenter.segment(remainingText)) {
      const w = charWidth(segment);
      if (currentWidth + w > targetWidth) {
        return `${out}\x1b[0m${tail}`;
      }
      out += segment;
      currentWidth += w;
    }
  }

  return `${out}\x1b[0m`;
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
    const tokens = rawLine.split(/(\s+)/).filter((t) => t.length > 0);
    let currentLine = '';
    let currentWidth = 0;

    for (const token of tokens) {
      const tokenWidth = visibleWidth(token);
      const isWhitespace = /^\s+$/.test(stripAnsi(token));

      // If token itself is too wide, we MUST break it by character
      if (tokenWidth > width) {
        // Flush current line if it exists
        if (currentLine) {
          result.push(`${currentLine}\x1b[0m`);
          currentLine = '';
          currentWidth = 0;
        }

        // Segmented break of the long token
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        for (const { segment } of segmenter.segment(token)) {
          const sw = charWidth(segment);
          if (currentWidth + sw > width) {
            result.push(`${currentLine}\x1b[0m`);
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
        result.push(`${currentLine.trimEnd()}\x1b[0m`);
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

/** Prefixes every line of a block with `columns` spaces. */
export function indentBlock(content: string, columns: number): string {
  if (columns <= 0) return content;
  const prefix = ' '.repeat(columns);
  return content
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}
