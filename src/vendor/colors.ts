/**
 * Bunti Vendored ANSI Colors
 *
 * Adapted from picocolors (https://github.com/alexeyraspopov/picocolors)
 * Copyright (c) 2021-2024 Oleksii Raspopov, Kostiantyn Denysov, Anton Verinov
 * MIT License.
 *
 * Vendored (and typed) so Bunti ships with zero runtime dependencies. It
 * keeps picocolors' wrap semantics: each formatter wraps text in open/close
 * ANSI codes and re-opens the style after any nested close code, so nested
 * styles compose correctly.
 */

/** Wraps input in ANSI codes. Non-strings are coerced via string conversion. */
export type ColorFormatter = (
  input: string | number | null | undefined,
) => string;

/**
 * The color surface Bunti exposes on `ctx.color` (minus Bunti's own RGB
 * helpers, which are layered on top in the DSL context).
 */
export interface BuntiColor {
  isColorSupported: boolean;
  reset: ColorFormatter;
  bold: ColorFormatter;
  dim: ColorFormatter;
  italic: ColorFormatter;
  underline: ColorFormatter;
  black: ColorFormatter;
  red: ColorFormatter;
  green: ColorFormatter;
  yellow: ColorFormatter;
  blue: ColorFormatter;
  magenta: ColorFormatter;
  cyan: ColorFormatter;
  white: ColorFormatter;
  gray: ColorFormatter;
  bgBlack: ColorFormatter;
  bgRed: ColorFormatter;
  bgGreen: ColorFormatter;
  bgYellow: ColorFormatter;
  bgBlue: ColorFormatter;
  bgMagenta: ColorFormatter;
  bgCyan: ColorFormatter;
  bgWhite: ColorFormatter;
}

const env = process.env ?? {};
const argv = process.argv ?? [];

const isColorSupported =
  !(env.NO_COLOR || argv.includes('--no-color')) &&
  Boolean(
    env.FORCE_COLOR ||
      argv.includes('--color') ||
      process.platform === 'win32' ||
      (process.stdout?.isTTY && env.TERM !== 'dumb') ||
      env.CI,
  );

/**
 * Replaces every occurrence of `close` inside `text` with `replace`, so an
 * inner style's reset re-opens the outer style instead of ending it.
 */
function replaceClose(
  text: string,
  close: string,
  replace: string,
  index: number,
): string {
  let result = '';
  let cursor = 0;
  do {
    result += text.substring(cursor, index) + replace;
    cursor = index + close.length;
    index = text.indexOf(close, cursor);
  } while (index !== -1);
  return result + text.substring(cursor);
}

function formatter(
  open: string,
  close: string,
  replace = open,
): ColorFormatter {
  if (!isColorSupported) {
    return (input) => `${input}`;
  }
  return (input) => {
    const text = `${input}`;
    const index = text.indexOf(close, open.length);
    return index !== -1
      ? open + replaceClose(text, close, replace, index) + close
      : open + text + close;
  };
}

export const colors: BuntiColor = {
  isColorSupported,
  reset: formatter('\x1b[0m', '\x1b[0m'),
  bold: formatter('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m'),
  dim: formatter('\x1b[2m', '\x1b[22m', '\x1b[22m\x1b[2m'),
  italic: formatter('\x1b[3m', '\x1b[23m'),
  underline: formatter('\x1b[4m', '\x1b[24m'),
  black: formatter('\x1b[30m', '\x1b[39m'),
  red: formatter('\x1b[31m', '\x1b[39m'),
  green: formatter('\x1b[32m', '\x1b[39m'),
  yellow: formatter('\x1b[33m', '\x1b[39m'),
  blue: formatter('\x1b[34m', '\x1b[39m'),
  magenta: formatter('\x1b[35m', '\x1b[39m'),
  cyan: formatter('\x1b[36m', '\x1b[39m'),
  white: formatter('\x1b[37m', '\x1b[39m'),
  gray: formatter('\x1b[90m', '\x1b[39m'),
  bgBlack: formatter('\x1b[40m', '\x1b[49m'),
  bgRed: formatter('\x1b[41m', '\x1b[49m'),
  bgGreen: formatter('\x1b[42m', '\x1b[49m'),
  bgYellow: formatter('\x1b[43m', '\x1b[49m'),
  bgBlue: formatter('\x1b[44m', '\x1b[49m'),
  bgMagenta: formatter('\x1b[45m', '\x1b[49m'),
  bgCyan: formatter('\x1b[46m', '\x1b[49m'),
  bgWhite: formatter('\x1b[47m', '\x1b[49m'),
};
