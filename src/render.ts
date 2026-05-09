/**
 * Bunti Rendering Core
 */

export const ANSI = {
  clear: '\x1b[2J\x1b[3J\x1b[H',
  home: '\x1b[H',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  reset: '\x1b[0m',
};

/**
 * Renders content to Bun.stdout using a high-performance DirectWriter
 */
export function render(content: string, options: { clear?: boolean; home?: boolean } = {}) {
  const writer = Bun.stdout.writer();
  if (options.clear) writer.write(ANSI.clear);
  if (options.home) writer.write(ANSI.home);
  writer.write(content + '\n');
  writer.flush();
}
