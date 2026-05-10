/**
 * Bunti Icon Engine
 * Purely tactical: Nerd Fonts or ASCII fallbacks. Emojis dropped for stability.
 */
import { detectCapabilities, type TerminalCapabilities } from './detect';

export interface IconDefinition {
  nf: string;    // Nerd Font
  ascii: string; // ASCII/Common Unicode fallback (Width 1)
}

export const ICON_MAP: Record<string, IconDefinition> = {
  // --- Source Control ---
  'branch':   { nf: '\u{F418}', ascii: '*' },
  'pr':       { nf: '\u{F41D}', ascii: '!' },
  'commit':   { nf: '\u{F417}', ascii: '+' },
  'merge':    { nf: '\u{F419}', ascii: '>' },
  'fork':     { nf: '\u{F41A}', ascii: 'Y' },
  'tag':      { nf: '\u{F412}', ascii: 't' },
  'repo':     { nf: '\u{F401}', ascii: 'R' },

  // --- File/Folder ---
  'folder':      { nf: '\u{F07B}', ascii: '[' },
  'folder-open': { nf: '\u{F115}', ascii: '{' },
  'file':        { nf: '\u{F15B}', ascii: '-' },
  'code':        { nf: '\u{F121}', ascii: '{' },
  'markdown':    { nf: '\u{F48A}', ascii: 'M' },
  'json':        { nf: '\u{E60B}', ascii: 'J' },
  'yaml':        { nf: '\u{E6A8}', ascii: 'Y' },

  // --- System & Hardware ---
  'cpu':      { nf: '\u{F2DB}', ascii: 'C' },
  'memory':   { nf: '\u{F538}', ascii: 'M' },
  'disk':     { nf: '\u{F0A0}', ascii: 'D' },
  'network':  { nf: '\u{F0AC}', ascii: 'N' },
  'terminal': { nf: '\u{F120}', ascii: '$' },
  'database': { nf: '\u{F1C0}', ascii: 'D' },
  'server':   { nf: '\u{F233}', ascii: 'S' },
  'cloud':    { nf: '\u{F0C2}', ascii: 'C' },

  // --- UI & Window Management ---
  'maximize': { nf: '\u{F2D0}', ascii: '^' },
  'minimize': { nf: '\u{F2D1}', ascii: 'v' },
  'close':    { nf: '\u{F00D}', ascii: 'x' },
  'exit':     { nf: '\u{F08B}', ascii: '<' },
  'eye':      { nf: '\u{F06E}', ascii: 'v' },
  'eye-off':  { nf: '\u{F070}', ascii: 'h' },
  'list':     { nf: '\u{F03A}', ascii: '=' },
  'grid':     { nf: '\u{F009}', ascii: '#' },
  'external': { nf: '\u{F08E}', ascii: '>' },
  'lock':     { nf: '\u{F023}', ascii: 'L' },
  'settings': { nf: '\u{F013}', ascii: '*' },
  'search':   { nf: '\u{F002}', ascii: '/' },
  'home':     { nf: '\u{F015}', ascii: 'H' },
  'user':     { nf: '\u{F007}', ascii: 'U' },

  // --- Navigation ---
  'chevron-left':  { nf: '\u{F053}', ascii: '<' },
  'chevron-right': { nf: '\u{F054}', ascii: '>' },
  'arrow-left':    { nf: '\u{F060}', ascii: '<' },
  'arrow-right':   { nf: '\u{F061}', ascii: '>' },

  // --- Status & Actions ---
  'success':   { nf: '\u{F00C}', ascii: 'v' },
  'error':     { nf: '\u{F00D}', ascii: 'x' },
  'warning':   { nf: '\u{F071}', ascii: '!' },
  'info':      { nf: '\u{F05A}', ascii: 'i' },
  'loading':   { nf: '\u{F110}', ascii: '~' },
  'play':      { nf: '\u{F04B}', ascii: '>' },
  'pause':     { nf: '\u{F04C}', ascii: '|' },
  'stop':      { nf: '\u{F04D}', ascii: 'X' },
  'refresh':   { nf: '\u{F021}', ascii: 'R' },
  'add':       { nf: '\u{F067}', ascii: '+' },
  'remove':    { nf: '\u{F068}', ascii: '-' },
  'heart':     { nf: '\u{F004}', ascii: '*' },
  'star':      { nf: '\u{F005}', ascii: '*' },
  'rocket':    { nf: '\u{F135}', ascii: 'R' },
  'satellite': { nf: '\u{EF5F}', ascii: 'S' },

  // --- Branding ---
  'bunti':  { nf: '\u{F08B5}', ascii: 'B' },
  'github': { nf: '\u{F09B}', ascii: 'G' },
  'git':    { nf: '\u{F1D3}', ascii: 'G' },
  'bun':    { nf: '\u{E76F}', ascii: 'B' },
  'npm':    { nf: '\u{E71E}', ascii: 'N' },
  'docker': { nf: '\u{F308}', ascii: 'D' },
  'js':     { nf: '\u{E74E}', ascii: 'J' },
  'ts':     { nf: '\u{E628}', ascii: 'T' },
  'python': { nf: '\u{E73C}', ascii: 'P' },
  'go':     { nf: '\u{E724}', ascii: 'G' },
  'rust':   { nf: '\u{E7A8}', ascii: 'R' },
  'node':   { nf: '\u{E718}', ascii: 'N' },
  'bullet': { nf: '\u{F0522}', ascii: '•' },
  'checkbox': { nf: '\u{F0132}', ascii: '[ ]' },
  'checkbox-check': { nf: '\u{F0133}', ascii: '[x]' },
};

let cachedCaps: TerminalCapabilities | null = null;
const customRegistry: Record<string, string> = {};

export async function init(): Promise<TerminalCapabilities> {
  if (!cachedCaps) cachedCaps = await detectCapabilities();
  return cachedCaps;
}

export function getIcon(name: string, caps: any): string {
  const def = ICON_MAP[name];
  if (!def) return '';
  if (caps.nerdFont) return def.nf;
  return def.ascii;
}

/**
 * Returns an opinionated icon with automatic fallback (Nerd Font or ASCII).
 */
export function icon(name: string): string {
  const caps = cachedCaps || { nerdFont: true };
  return getIcon(name, caps);
}

/**
 * Returns a specific Nerd Font icon by name from the registry.
 */
export function nerd(name: string): string {
  const caps = cachedCaps || { nerdFont: true };
  if (!caps.nerdFont) return ICON_MAP[name]?.ascii || '';
  return ICON_MAP[name]?.nf || customRegistry[name] || '';
}

/**
 * Registers a custom Nerd Font icon for use in the current session.
 */
export function register(name: string, glyph: string): void {
  customRegistry[name] = glyph;
}

export function nerdIcon(nfChar: string, fallback: string): string {
  const caps = cachedCaps || { nerdFont: true };
  return caps.nerdFont ? nfChar : fallback;
}
