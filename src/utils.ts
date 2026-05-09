// Helper to strip ANSI codes to get true visible length
export const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');

/**
 * Simple visible width calculation.
 * Standard for basic TUI layout.
 */
export function visibleWidth(str: string): number {
  return stripAnsi(str).length;
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
  let inAnsi = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i]!;
    if (char === '\x1b') inAnsi = true;
    
    if (inAnsi) {
      out += char;
      if (char === 'm') inAnsi = false;
      continue;
    }

    if (currentWidth + 1 > targetWidth) break;
    out += char;
    currentWidth++;
  }

  return out + tail + '\x1b[0m';
}
