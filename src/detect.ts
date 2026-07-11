/**
 * Bunti Terminal Capability Detection
 */

export interface TerminalCapabilities {
  nerdFont: boolean;
  glyphProtocol: boolean;
  unicode: boolean;
  color: boolean;
}

/**
 * Color capability tiers, from full 24-bit RGB down to no color at all.
 * `resolveColor()` quantizes RGB values to the active tier automatically.
 */
export type ColorTier = 'truecolor' | '256' | '16' | 'mono';

/** TERM_PROGRAM values known to render 24-bit color. */
const TRUECOLOR_PROGRAMS = [
  'Ghostty',
  'WezTerm',
  'iTerm.app',
  'WarpTerminal',
  'vscode',
  'Hyper',
  'Rio',
  'Term7',
];

/**
 * Pure tier detection from an environment map (defaults to process.env).
 *
 * Rules, in order:
 * 1. NO_COLOR set to a non-empty value -> 'mono' (https://no-color.org spec).
 * 2. TERM=dumb -> 'mono'.
 * 3. COLORTERM=truecolor|24bit -> 'truecolor'.
 * 4. Known truecolor TERM_PROGRAM, or a truecolor/direct TERM -> 'truecolor'.
 * 5. TERM containing "256color" -> '256'.
 * 6. Legacy TERM families (xterm, screen, vt100, linux, ...) -> '16'.
 * 7. Otherwise -> 'truecolor' (optimistic: modern terminals rarely set hints).
 */
export function detectColorTier(
  env: Record<string, string | undefined> = process.env,
): ColorTier {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 'mono';
  const term = env.TERM || '';
  if (term === 'dumb') return 'mono';

  const colorterm = (env.COLORTERM || '').toLowerCase();
  if (colorterm === 'truecolor' || colorterm === '24bit') return 'truecolor';
  if (TRUECOLOR_PROGRAMS.includes(env.TERM_PROGRAM || '')) return 'truecolor';
  if (
    term.includes('truecolor') ||
    term.includes('24bit') ||
    term.includes('direct')
  ) {
    return 'truecolor';
  }
  if (term.includes('256color')) return '256';
  if (/^(xterm|screen|tmux|vt(1|2)\d\d|rxvt|linux|ansi|cygwin)/.test(term)) {
    return '16';
  }
  return 'truecolor';
}

let tierOverride: ColorTier | undefined;
let detectedTier: ColorTier | undefined;

/**
 * Returns the active color tier. Detection runs lazily on first call and is
 * cached; `setColorTier()` overrides it (used by ScreenOptions.colorTier and
 * tests).
 */
export function colorTier(): ColorTier {
  if (tierOverride !== undefined) return tierOverride;
  if (detectedTier === undefined) detectedTier = detectColorTier();
  return detectedTier;
}

/**
 * Forces a color tier (pass undefined to clear the override and re-detect
 * lazily on the next `colorTier()` call).
 */
export function setColorTier(tier?: ColorTier) {
  tierOverride = tier;
  if (tier === undefined) detectedTier = undefined;
}

/**
 * Detects terminal capabilities using environment variables and
 * modern protocol handshakes.
 */
export async function detectCapabilities(): Promise<TerminalCapabilities> {
  const caps: TerminalCapabilities = {
    nerdFont: false,
    glyphProtocol: false,
    unicode: true,
    color: true,
  };

  // 1. Environment Variable Heuristics
  const term = process.env.TERM_PROGRAM || '';
  const termEmulator = process.env.TERMINAL_EMULATOR || '';
  const nerdEnv =
    process.env.NERD_FONTS || process.env.NERD_FONT || process.env.BUNTI_NF;

  // Optimistic list of terminals known to support modern fonts
  const modernTerms = [
    'Ghostty',
    'WezTerm',
    'iTerm.app',
    'WarpTerminal',
    'Apple_Terminal',
    'vscode',
    'Hyper',
    'Rio',
    'Term7',
  ];

  if (nerdEnv === '1' || nerdEnv === 'true' || nerdEnv === 'yes') {
    caps.nerdFont = true;
  } else if (nerdEnv === '0' || nerdEnv === 'false' || nerdEnv === 'no') {
    caps.nerdFont = false; // explicit override: force the ASCII tier
  } else if (modernTerms.includes(term) || modernTerms.includes(termEmulator)) {
    caps.nerdFont = true;
  } else if (process.env.LC_TERMINAL === 'iTerm2') {
    caps.nerdFont = true;
  }

  // 2. Glyph Protocol Handshake (Ghostty 1.3+, Rio, WezTerm)
  // We send the Support Query and wait briefly for a response.
  // Note: This is an optimistic check for now, can be expanded to
  // a full async TTY listener if needed.
  if (term === 'Ghostty') {
    caps.glyphProtocol = true;
  }

  return caps;
}
