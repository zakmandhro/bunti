/**
 * Bunti Terminal Capability Detection
 *
 * Env-first and synchronous: `identifyTerminal()` is a pure function from an
 * environment map to a `TerminalProfile` (app, version, multiplexer,
 * truecolor, sync-output support, Nerd Font policy). No escape-sequence
 * probes are sent; async handshakes are deliberately deferred.
 */

/** Legacy capability shape (kept for back-compat; see TerminalProfile). */
export interface TerminalCapabilities {
  nerdFont: boolean;
  glyphProtocol: boolean;
  unicode: boolean;
  color: boolean;
}

/** Terminal emulators Bunti identifies from environment variables. */
export type TerminalApp =
  | 'ghostty'
  | 'kitty'
  | 'wezterm'
  | 'iterm2'
  | 'alacritty'
  | 'vscode'
  | 'apple-terminal'
  | 'warp'
  | 'unknown';

/**
 * Nerd Font availability policy:
 * - 'yes': the terminal embeds Nerd Font symbols (Ghostty >= 1.2).
 * - 'assumed-yes': power-user terminals whose users overwhelmingly install
 *   patched fonts (kitty, WezTerm, iTerm2, Warp, Alacritty).
 * - 'assumed-no': stock fonts, no embedded symbols (VS Code, Apple Terminal,
 *   unknown terminals) — Bunti falls back to the ASCII icon tier.
 * - 'no': explicitly disabled via BUNTI_NF/NERD_FONTS.
 */
export type NerdFontPolicy = 'yes' | 'no' | 'assumed-yes' | 'assumed-no';

/**
 * Everything Bunti knows about the hosting terminal, derived purely from
 * environment variables. Exposed as `ctx.terminal` (detected once per
 * render()).
 */
export interface TerminalProfile {
  /** Identified terminal emulator ('unknown' when no signal matches). */
  app: TerminalApp;
  /** TERM_PROGRAM_VERSION / LC_TERMINAL_VERSION when available. */
  version?: string;
  /** Terminal multiplexer sitting between Bunti and the emulator. */
  multiplexer?: 'tmux' | 'screen';
  /** 24-bit color support (mirrors detectColorTier() === 'truecolor'). */
  truecolor: boolean;
  /** Known support for synchronized output (DEC private mode 2026). */
  syncOutput: boolean;
  /** Nerd Font glyph policy for the icon engine. */
  nerdFont: NerdFontPolicy;
  /** 'override' when BUNTI_NF/NERD_FONTS forced the nerdFont field. */
  source: 'override' | 'env';
}

type Env = Record<string, string | undefined>;

/**
 * Color capability tiers, from full 24-bit RGB down to no color at all.
 * `resolveColor()` quantizes RGB values to the active tier automatically.
 */
export type ColorTier = 'truecolor' | '256' | '16' | 'mono';

/**
 * TERM_PROGRAM values known to render 24-bit color but NOT part of the
 * TerminalApp union (those are covered by app identification).
 */
const EXTRA_TRUECOLOR_PROGRAMS = ['Hyper', 'Rio', 'Term7'];

/** Apps with known 24-bit color support (all identified apps but Apple Terminal). */
const TRUECOLOR_APPS: readonly TerminalApp[] = [
  'ghostty',
  'kitty',
  'wezterm',
  'iterm2',
  'alacritty',
  'vscode',
  'warp',
];

/** Apps with known synchronized-output (mode 2026) support. */
const SYNC_OUTPUT_APPS: readonly TerminalApp[] = [
  'ghostty',
  'kitty',
  'wezterm',
  'iterm2',
  'alacritty',
  'warp',
];

/** Nerd Font policy per identified app (see NerdFontPolicy). */
const NERD_FONT_POLICY: Record<TerminalApp, NerdFontPolicy> = {
  ghostty: 'yes', // embeds Symbols Nerd Font since 1.2
  kitty: 'assumed-yes',
  wezterm: 'assumed-yes',
  iterm2: 'assumed-yes',
  warp: 'assumed-yes',
  alacritty: 'assumed-yes',
  vscode: 'assumed-no',
  'apple-terminal': 'assumed-no',
  unknown: 'assumed-no',
};

/** The TERM_PROGRAM value each app announces (when it sets one at all). */
const TERM_PROGRAM_BY_APP: Partial<Record<TerminalApp, string>> = {
  ghostty: 'ghostty', // lowercase — Ghostty never capitalizes it
  wezterm: 'WezTerm',
  iterm2: 'iTerm.app',
  vscode: 'vscode',
  'apple-terminal': 'Apple_Terminal',
  warp: 'WarpTerminal',
};

interface AppSignal {
  app: TerminalApp;
  version?: string;
  multiplexer?: 'tmux' | 'screen';
}

/**
 * Identifies the terminal app, version, and multiplexer from env vars.
 * App-specific variables (GHOSTTY_RESOURCES_DIR, KITTY_WINDOW_ID, ...) are
 * checked alongside TERM_PROGRAM because they survive tmux/screen, whose
 * inner TERM rewrites would otherwise mask the outer emulator.
 */
function detectApp(env: Env): AppSignal {
  const term = env.TERM || '';
  const termProgram = env.TERM_PROGRAM || '';

  const multiplexer: AppSignal['multiplexer'] = env.TMUX
    ? 'tmux'
    : term.startsWith('tmux')
      ? 'tmux'
      : env.STY || term.startsWith('screen')
        ? 'screen'
        : undefined;

  let app: TerminalApp = 'unknown';
  if (
    env.GHOSTTY_RESOURCES_DIR ||
    termProgram === 'ghostty' ||
    term === 'xterm-ghostty'
  ) {
    app = 'ghostty';
  } else if (env.KITTY_WINDOW_ID || term === 'xterm-kitty') {
    app = 'kitty';
  } else if (env.WEZTERM_PANE || termProgram === 'WezTerm') {
    app = 'wezterm';
  } else if (termProgram === 'iTerm.app' || env.LC_TERMINAL === 'iTerm2') {
    app = 'iterm2';
  } else if (env.ALACRITTY_WINDOW_ID || term === 'alacritty') {
    app = 'alacritty';
  } else if (termProgram === 'vscode') {
    app = 'vscode';
  } else if (termProgram === 'Apple_Terminal') {
    app = 'apple-terminal';
  } else if (termProgram === 'WarpTerminal') {
    app = 'warp';
  }

  let version: string | undefined;
  if (termProgram !== '' && termProgram === TERM_PROGRAM_BY_APP[app]) {
    version = env.TERM_PROGRAM_VERSION || undefined;
  } else if (app === 'iterm2' && env.LC_TERMINAL === 'iTerm2') {
    version = env.LC_TERMINAL_VERSION || undefined;
  }

  return { app, version, multiplexer };
}

/**
 * Parses the BUNTI_NF / NERD_FONTS / NERD_FONT override variables.
 * Returns 'yes'/'no' when forced, undefined when unset or unrecognized.
 */
function nerdFontOverride(env: Env): 'yes' | 'no' | undefined {
  const value = env.NERD_FONTS || env.NERD_FONT || env.BUNTI_NF;
  if (value === '1' || value === 'true' || value === 'yes') return 'yes';
  if (value === '0' || value === 'false' || value === 'no') return 'no';
  return undefined;
}

/**
 * Pure env-to-profile detection (defaults to process.env). Never mutates the
 * environment and sends no escape sequences, so it is safe to call anywhere.
 *
 * Detection order:
 * 1. BUNTI_NF/NERD_FONTS/NERD_FONT force the nerdFont field on or off
 *    (source: 'override'); app identification still runs.
 * 2. TMUX/screen are recorded as `multiplexer`; app identification then
 *    relies on variables that pass through the multiplexer.
 * 3. App signals, in order: Ghostty (GHOSTTY_RESOURCES_DIR, lowercase
 *    TERM_PROGRAM=ghostty, TERM=xterm-ghostty), kitty (KITTY_WINDOW_ID,
 *    TERM=xterm-kitty), WezTerm (WEZTERM_PANE, TERM_PROGRAM), iTerm2
 *    (TERM_PROGRAM=iTerm.app, LC_TERMINAL=iTerm2), Alacritty
 *    (ALACRITTY_WINDOW_ID, TERM=alacritty), VS Code, Apple Terminal, Warp.
 */
export function identifyTerminal(
  env: Env = process.env as Env,
): TerminalProfile {
  const { app, version, multiplexer } = detectApp(env);
  const override = nerdFontOverride(env);

  const profile: TerminalProfile = {
    app,
    truecolor: detectColorTier(env) === 'truecolor',
    syncOutput: SYNC_OUTPUT_APPS.includes(app),
    nerdFont: override ?? NERD_FONT_POLICY[app],
    source: override !== undefined ? 'override' : 'env',
  };
  if (version !== undefined) profile.version = version;
  if (multiplexer !== undefined) profile.multiplexer = multiplexer;
  return profile;
}

/**
 * Pure tier detection from an environment map (defaults to process.env).
 *
 * Rules, in order:
 * 1. NO_COLOR set to a non-empty value -> 'mono' (https://no-color.org spec).
 * 2. TERM=dumb -> 'mono'.
 * 3. COLORTERM=truecolor|24bit -> 'truecolor'.
 * 4. An identified truecolor-capable app (ghostty, kitty, wezterm, iterm2,
 *    alacritty, vscode, warp) -> 'truecolor'. This also catches TERM values
 *    like xterm-kitty that the legacy TERM families would misclassify.
 * 5. Known truecolor TERM_PROGRAM, or a truecolor/direct TERM -> 'truecolor'.
 * 6. TERM containing "256color" -> '256'.
 * 7. Legacy TERM families (xterm, screen, vt100, linux, ...) -> '16'.
 * 8. Otherwise -> 'truecolor' (optimistic: modern terminals rarely set hints).
 */
export function detectColorTier(env: Env = process.env as Env): ColorTier {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 'mono';
  const term = env.TERM || '';
  if (term === 'dumb') return 'mono';

  const colorterm = (env.COLORTERM || '').toLowerCase();
  if (colorterm === 'truecolor' || colorterm === '24bit') return 'truecolor';
  const { app } = detectApp(env);
  if (TRUECOLOR_APPS.includes(app)) return 'truecolor';
  if (EXTRA_TRUECOLOR_PROGRAMS.includes(env.TERM_PROGRAM || '')) {
    return 'truecolor';
  }
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
 * Back-compat wrapper over `identifyTerminal()` returning the legacy
 * TerminalCapabilities shape. Prefer `identifyTerminal()` / `ctx.terminal`.
 */
export async function detectCapabilities(
  env: Env = process.env as Env,
): Promise<TerminalCapabilities> {
  const profile = identifyTerminal(env);
  return {
    nerdFont: profile.nerdFont === 'yes' || profile.nerdFont === 'assumed-yes',
    glyphProtocol: profile.app === 'ghostty',
    unicode: true,
    color: detectColorTier(env) !== 'mono',
  };
}
