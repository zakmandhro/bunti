/**
 * Bunti Icon Engine
 * Purely tactical: Nerd Fonts or ASCII fallbacks.
 *
 * Two tiers of names resolve through icon()/getIcon():
 *   1. The curated ICON_MAP below (88 short names with ASCII fallbacks).
 *   2. A runtime registry filled via register()/registerAll() — most notably
 *      by `import '@zakmandhro/bunti/icons-full'`, which installs the full
 *      Nerd Fonts v3.4.0 glyph set (~10.7k names like 'fa-rocket').
 */
import type { IconName } from './data/nf-names';
import {
  identifyTerminal,
  type TerminalCapabilities,
  type TerminalProfile,
} from './detect';
import {
  hintsSuppressed,
  nearestMatch,
  registerHintFlusher,
} from './diagnostics';

/** An icon's Nerd Font glyph plus its plain-terminal ASCII stand-in. */
export interface IconDefinition {
  /** Nerd Font glyph (private-use-area codepoint). */
  nf: string;
  /** Single-char ASCII fallback for non-NF terminals. */
  ascii: string;
}

const CURATED_ICONS = {
  add: { nf: '\uf067', ascii: '+' },
  'arrow-left': { nf: '\uf060', ascii: '<' },
  'arrow-right': { nf: '\uf061', ascii: '>' },
  bars: { nf: '\uf0c9', ascii: '=' },
  bell: { nf: '\uf0f3', ascii: '!' },
  branch: { nf: '\uf418', ascii: '*' },
  bullet: { nf: '\uf111', ascii: '*' },
  bun: { nf: '\ue76f', ascii: 'B' },
  bunti: { nf: '\u{f0065}', ascii: '@' },
  check: { nf: '\uf00c', ascii: 'v' },
  checkbox: { nf: '\uf0c8', ascii: '#' },
  'checkbox-check': { nf: '\uf14a', ascii: 'X' },
  'chevron-down': { nf: '\uf078', ascii: 'v' },
  'chevron-left': { nf: '\uf053', ascii: '<' },
  'chevron-right': { nf: '\uf054', ascii: '>' },
  close: { nf: '\uf00d', ascii: 'x' },
  cloud: { nf: '\uf0c2', ascii: 'C' },
  code: { nf: '\uf121', ascii: '{' },
  commit: { nf: '\uf172', ascii: '+' },
  copy: { nf: '\uf0c5', ascii: '=' },
  cpu: { nf: '\uf2db', ascii: 'C' },
  database: { nf: '\uf1c0', ascii: 'D' },
  desktop: { nf: '\u{f01c4}', ascii: 'D' },
  disk: { nf: '\uf0a0', ascii: 'D' },
  download: { nf: '\uf019', ascii: 'v' },
  'draft-pr': { nf: '\uebdb', ascii: '!' },
  edit: { nf: '\uf044', ascii: 'e' },
  error: { nf: '\uf00d', ascii: 'x' },
  exit: { nf: '\uf08b', ascii: '<' },
  external: { nf: '\uf08e', ascii: '>' },
  eye: { nf: '\uf06e', ascii: 'v' },
  'eye-off': { nf: '\uf070', ascii: 'h' },
  file: { nf: '\uf15b', ascii: '-' },
  folder: { nf: '\uf07b', ascii: '[' },
  'folder-open': { nf: '\uf115', ascii: '{' },
  fork: { nf: '\uf41a', ascii: 'Y' },
  gear: { nf: '\uf423', ascii: '*' },
  git: { nf: '\ue702', ascii: 'g' },
  grid: { nf: '\uf009', ascii: '#' },
  heart: { nf: '\uf004', ascii: '*' },
  'help-circle': { nf: '\uf059', ascii: '?' },
  home: { nf: '\uf015', ascii: 'H' },
  image: { nf: '\uf03e', ascii: 'I' },
  info: { nf: '\uf05a', ascii: 'i' },
  issue: { nf: '\uebd9', ascii: '#' },
  json: { nf: '\ue60b', ascii: 'J' },
  laptop: { nf: '\uf109', ascii: 'L' },
  list: { nf: '\uf03a', ascii: '=' },
  loading: { nf: '\uf110', ascii: '~' },
  lock: { nf: '\uf023', ascii: 'L' },
  mail: { nf: '\uf0e0', ascii: '@' },
  markdown: { nf: '\uf48a', ascii: 'M' },
  maximize: { nf: '\uf0c8', ascii: '^' },
  memory: { nf: '\uf0c7', ascii: 'M' },
  menu: { nf: '\uf0c9', ascii: '=' },
  merge: { nf: '\uf419', ascii: '>' },
  minimize: { nf: '\u{f10fe}', ascii: 'v' },
  network: { nf: '\uf0ac', ascii: 'N' },
  node: { nf: '\ue718', ascii: 'N' },
  pause: { nf: '\uf04c', ascii: '|' },
  pencil: { nf: '\uf044', ascii: 'e' },
  planet: { nf: '\ue22e', ascii: 'O' },
  play: { nf: '\uf04b', ascii: '>' },
  'plus-circle': { nf: '\uea60', ascii: '+' },
  pr: { nf: '\uf41d', ascii: '!' },
  refresh: { nf: '\uf021', ascii: 'R' },
  remove: { nf: '\uf068', ascii: '-' },
  repo: { nf: '\uf401', ascii: 'R' },
  robot: { nf: '\u{f06a9}', ascii: 'A' },
  rocket: { nf: '\uf135', ascii: 'R' },
  satellite: { nf: '\uef5f', ascii: 'S' },
  save: { nf: '\uf0c7', ascii: 'S' },
  search: { nf: '\uf002', ascii: '/' },
  send: { nf: '\uec0f', ascii: '>' },
  server: { nf: '\uf233', ascii: 'S' },
  settings: { nf: '\uf013', ascii: '*' },
  'staggered-bars': { nf: '\u{ee19}', ascii: '=' },
  star: { nf: '\uf005', ascii: '*' },
  stop: { nf: '\uf04d', ascii: 'X' },
  success: { nf: '\uf00c', ascii: 'v' },
  tag: { nf: '\u{f04fc}', ascii: 't' },
  terminal: { nf: '\uf120', ascii: '$' },
  trash: { nf: '\uf1f8', ascii: 'x' },
  user: { nf: '\uf007', ascii: 'U' },
  warning: { nf: '\uf071', ascii: '!' },
  wizard: { nf: '\u{f1477}', ascii: 'W' },
  yaml: { nf: '\ue6a8', ascii: 'Y' },
  zap: { nf: '\uf0e7', ascii: 'z' },
} satisfies Record<string, IconDefinition>;

/** Short names of the curated, width-audited icon set. */
export type CuratedIconName = keyof typeof CURATED_ICONS;

/**
 * Any icon name Bunti can resolve: curated short names, full Nerd Fonts
 * names (available after `import '@zakmandhro/bunti/icons-full'`), or
 * custom names added via register(). Arbitrary strings stay assignable.
 */
export type BuntiIconName =
  | CuratedIconName
  | IconName
  | (string & Record<never, never>);

/** The curated icon table: 88 width-audited names with ASCII fallbacks. */
export const ICON_MAP: Record<string, IconDefinition> = CURATED_ICONS;

/**
 * Emoji-to-icon-name swaps applied automatically to drawn text (emoji
 * render at unreliable widths across terminals; their NF twins are
 * width-audited). Set `raw: true` on a cell to bypass.
 */
export const EMOJI_MAP: Record<string, string> = {
  '🌿': 'branch',
  '📥': 'pr',
  '📌': 'commit',
  '🔀': 'merge',
  '🍴': 'fork',
  '🏷️': 'tag',
  '📁': 'folder',
  '📂': 'folder-open',
  '📄': 'file',
  '💻': 'laptop',
  '🖥️': 'desktop',
  '📝': 'edit',
  '📦': 'json',
  '📜': 'yaml',
  '✅': 'success',
  '❌': 'error',
  '⚠️': 'warning',
  ℹ️: 'info',
  '⏳': 'loading',
  '🚀': 'rocket',
  '🥟': 'satellite',
  '🪐': 'planet',
  '🌀': 'bunti',
  '🤖': 'robot',
  '🗑️': 'trash',
  '⚙️': 'gear',
  '🔔': 'bell',
  '✉️': 'mail',
  '🖼️': 'image',
  '❓': 'help-circle',
  '🙂': 'success',
  '😊': 'success',
  '😀': 'success',
};

const _GENERIC_ICON = '\uf0010';

const cachedCaps: TerminalCapabilities = {
  nerdFont: true,
  glyphProtocol: false,
  unicode: true,
  color: true,
};

// Single precompiled alternation instead of 33 RegExp constructions per call.
// Longest keys first so variants with a variation selector win over bare emoji.
let emojiPattern: RegExp | null = null;

function getEmojiPattern(): RegExp {
  if (!emojiPattern) {
    const keys = Object.keys(EMOJI_MAP).sort((a, b) => b.length - a.length);
    emojiPattern = new RegExp(`(?:${keys.join('|')})[\uFE00-\uFE0F]?`, 'g');
  }
  return emojiPattern;
}

/**
 * Swaps known emoji in a string for their width-audited Nerd Font icons
 * (see EMOJI_MAP). Applied automatically by draw calls; no-op on the
 * ASCII tier.
 */
export function replaceEmojis(text: string): string {
  if (!text) return '';
  if (!cachedCaps.nerdFont) return text;

  // Fast path: pure-ASCII strings (the overwhelming majority of cells) contain no emoji.
  let ascii = true;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      ascii = false;
      break;
    }
  }
  if (ascii) return text;

  return text.replace(getEmojiPattern(), (match) => {
    // Map keys may or may not carry a trailing variation selector; try both.
    const name =
      EMOJI_MAP[match] ?? EMOJI_MAP[match.replace(/[\uFE00-\uFE0F]$/, '')];
    return name ? getIcon(name, cachedCaps) : match;
  });
}

/**
 * Initializes the icon tier from terminal detection.
 *
 * - `init({ nerdFont })` forces the tier explicitly (always wins).
 * - `init({ profile })` derives it from a pre-detected TerminalProfile
 *   (render() passes the per-screen profile here).
 * - `init()` runs env detection itself via `identifyTerminal()`.
 *
 * 'yes' / 'assumed-yes' policies map to Nerd Font glyphs; everything else
 * falls back to the ASCII tier. Until init() is called the module defaults
 * to Nerd Font glyphs (back-compat for direct icon() usage).
 */
export async function init(options?: {
  nerdFont?: boolean;
  profile?: TerminalProfile;
}): Promise<TerminalCapabilities> {
  if (options?.nerdFont !== undefined) {
    cachedCaps.nerdFont = options.nerdFont;
    return cachedCaps;
  }
  const profile = options?.profile ?? identifyTerminal();
  cachedCaps.nerdFont =
    profile.nerdFont === 'yes' || profile.nerdFont === 'assumed-yes';
  cachedCaps.glyphProtocol = profile.app === 'ghostty';
  return cachedCaps;
}

// --- Runtime icon registry (tier 2) ---
// Consulted after the curated ICON_MAP. The icons-full subpath bulk-loads
// every Nerd Fonts glyph here; apps can also register their own icons.

const registryNf = new Map<string, string>();
const registryAscii = new Map<string, string>();

/** ASCII-tier stand-in for registered icons without an explicit fallback. */
const REGISTRY_ASCII_FALLBACK = '*';

function stripNfPrefix(name: string): string {
  return name.startsWith('nf-') ? name.slice(3) : name;
}

/**
 * Registers a runtime icon. Accepts a bare Nerd Font glyph, or a full
 * definition with an ASCII fallback for `init({ nerdFont: false })` tiers
 * (bare glyphs fall back to '*' in the ASCII tier).
 */
export function register(
  name: string,
  glyphOrDef: string | IconDefinition,
): void {
  if (typeof glyphOrDef === 'string') {
    registryNf.set(name, glyphOrDef);
  } else {
    registryNf.set(name, glyphOrDef.nf);
    registryAscii.set(name, glyphOrDef.ascii);
  }
}

/** Bulk-registers name -> glyph pairs (used by the icons-full subpath). */
export function registerAll(glyphs: Record<string, string>): void {
  for (const name in glyphs) {
    registryNf.set(name, glyphs[name]);
  }
}

// --- Unknown-name diagnostics ---
// Misses are buffered in a Set and drained through the shared diagnostics
// exit flush (src/diagnostics.ts), so warnings never tear an active frame
// mid-render and every dev hint arrives in one block on process exit.

const missedNames = new Set<string>();
let flusherRegistered = false;

function recordMiss(name: string): void {
  if (hintsSuppressed()) return;
  missedNames.add(name);
  if (!flusherRegistered) {
    flusherRegistered = true;
    registerHintFlusher(drainIconHintLines);
  }
}

function* iconNameCandidates(): Generator<string> {
  yield* Object.keys(ICON_MAP);
  yield* registryNf.keys();
}

function nearestIconName(name: string): string | undefined {
  return nearestMatch(stripNfPrefix(name), iconNameCandidates());
}

/** Drains buffered misses into hint lines (called by the exit flush). */
function drainIconHintLines(): string[] {
  if (missedNames.size === 0) return [];
  const lines: string[] = [];
  for (const name of missedNames) {
    const hint = nearestIconName(name);
    lines.push(
      `unknown icon '${name}' rendered as ''` +
        `${hint ? ` (did you mean '${hint}'?)` : ''}`,
    );
  }
  if (registryNf.size === 0) {
    lines.push(
      "tip: import '@zakmandhro/bunti/icons-full' to enable all ~10.7k Nerd Font icons by name",
    );
  }
  missedNames.clear();
  return lines;
}

/** @internal Test hook: unresolved names buffered so far. */
export function __iconMisses(): string[] {
  return [...missedNames];
}

/**
 * Resolves an icon name. Resolution order:
 *   1. Curated ICON_MAP (short names, keeps ASCII fallbacks + aliases).
 *   2. Runtime registry (register()/registerAll(), e.g. the icons-full
 *      pack). A leading 'nf-' is stripped: 'nf-fa-rocket' === 'fa-rocket'.
 *   3. '' — the miss is buffered and reported once on process exit.
 */
export function getIcon(
  name: BuntiIconName,
  caps: TerminalCapabilities,
): string {
  const def = ICON_MAP[name];
  if (def) return caps.nerdFont ? def.nf : def.ascii;

  const key = registryNf.has(name) ? name : stripNfPrefix(name);
  const nf = registryNf.get(key);
  if (nf !== undefined) {
    if (caps.nerdFont) return nf;
    return registryAscii.get(key) ?? REGISTRY_ASCII_FALLBACK;
  }

  recordMiss(name);
  return '';
}

/**
 * Resolves an icon name to a glyph on the active tier (Nerd Font glyph,
 * or ASCII fallback on plain terminals). Unknown names render as '' and
 * are reported once on process exit with a nearest-name hint.
 * @example text(`${icon('rocket')} Launch`);
 */
export function icon(name: BuntiIconName): string {
  return getIcon(name, cachedCaps);
}

/** Returns the Nerd Font glyph for a name regardless of the active tier. */
export function nerd(name: BuntiIconName): string {
  return (
    ICON_MAP[name]?.nf ??
    registryNf.get(name) ??
    registryNf.get(stripNfPrefix(name)) ??
    ''
  );
}

/** Picks the given Nerd Font char on the NF tier, else the fallback. */
export function nerdIcon(nfChar: string, fallback: string): string {
  return cachedCaps.nerdFont ? nfChar : fallback;
}
