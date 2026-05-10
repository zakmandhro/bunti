/**
 * Bunti Icon Engine
 * The "Stable 60+": Universally compatible tactical icons with high-fidelity fallbacks.
 */
import { detectCapabilities, type TerminalCapabilities } from './detect';

export interface IconDefinition {
  nf: string;    // Nerd Font
  emoji: string; // Emoji fallback
  ascii: string; // ASCII/Common Unicode fallback (Width 1)
}

export const ICON_MAP: Record<string, IconDefinition> = {
  // --- Source Control ---
  'branch':   { nf: '\u{F418}', emoji: '🌿', ascii: '*' },
  'pr':       { nf: '\u{F41D}', emoji: '📥', ascii: '!' },
  'commit':   { nf: '\u{F417}', emoji: '📌', ascii: '+' },
  'merge':    { nf: '\u{F419}', emoji: '🔀', ascii: '>' },
  'fork':     { nf: '\u{F41A}', emoji: '🍴', ascii: 'Y' },
  'tag':      { nf: '\u{F412}', emoji: '🏷️', ascii: 't' },
  'repo':     { nf: '\u{F401}', emoji: '📁', ascii: 'R' },

  // --- File/Folder ---
  'folder':      { nf: '\u{F07B}', emoji: '📁', ascii: '[' },
  'folder-open': { nf: '\u{F115}', emoji: '📂', ascii: '{' },
  'file':        { nf: '\u{F15B}', emoji: '📄', ascii: '-' },
  'code':        { nf: '\u{F121}', emoji: '💻', ascii: '{' },
  'markdown':    { nf: '\u{F48A}', emoji: '📝', ascii: 'M' },
  'json':        { nf: '\u{E60B}', emoji: '📦', ascii: 'J' },
  'yaml':        { nf: '\u{E6A8}', emoji: '📜', ascii: 'Y' },

  // --- System & Hardware ---
  'cpu':      { nf: '\u{F2DB}', emoji: '💻', ascii: 'C' },
  'memory':   { nf: '\u{F538}', emoji: '🧠', ascii: 'M' },
  'disk':     { nf: '\u{F0A0}', emoji: '💽', ascii: 'D' },
  'network':  { nf: '\u{F0AC}', emoji: '🌐', ascii: 'N' },
  'terminal': { nf: '\u{F120}', emoji: '💻', ascii: '$' },
  'database': { nf: '\u{F1C0}', emoji: '🗄️', ascii: 'D' },
  'server':   { nf: '\u{F233}', emoji: '🖥️', ascii: 'S' },
  'cloud':    { nf: '\u{F0C2}', emoji: '☁️', ascii: '☁' },

  // --- UI & Window Management ---
  'maximize': { nf: '\u{F2D0}', emoji: '↔️', ascii: '▲' },
  'minimize': { nf: '\u{F2D1}', emoji: '↙️', ascii: '▼' },
  'close':    { nf: '\u{F00D}', emoji: '✖️', ascii: '✖' },
  'exit':     { nf: '\u{F08B}', emoji: '🚪', ascii: '←' },
  'eye':      { nf: '\u{F06E}', emoji: '👁️', ascii: 'v' },
  'eye-off':  { nf: '\u{F070}', emoji: '🙈', ascii: 'h' },
  'list':     { nf: '\u{F03A}', emoji: '📋', ascii: '=' },
  'grid':     { nf: '\u{F009}', emoji: '▦',  ascii: '#' },
  'external': { nf: '\u{F08E}', emoji: '↗️', ascii: '↗' },
  'lock':     { nf: '\u{F023}', emoji: '🔒', ascii: 'L' },
  'settings': { nf: '\u{F013}', emoji: '⚙️', ascii: '⚙' },
  'search':   { nf: '\u{F002}', emoji: '🔍', ascii: '/' },
  'home':     { nf: '\u{F015}', emoji: '🏠', ascii: 'H' },
  'user':     { nf: '\u{F007}', emoji: '👤', ascii: 'U' },

  // --- Navigation ---
  'chevron-left':  { nf: '\u{F053}', emoji: '◀️', ascii: '◀' },
  'chevron-right': { nf: '\u{F054}', emoji: '▶️', ascii: '▶' },
  'arrow-left':    { nf: '\u{F060}', emoji: '⬅️', ascii: '←' },
  'arrow-right':   { nf: '\u{F061}', emoji: '➡️', ascii: '→' },

  // --- Status & Actions ---
  'success':   { nf: '\u{F00C}', emoji: '✅', ascii: '✔' },
  'error':     { nf: '\u{F00D}', emoji: '❌', ascii: '✖' },
  'warning':   { nf: '\u{F071}', emoji: '⚠️', ascii: '⚠' },
  'info':      { nf: '\u{F05A}', emoji: 'ℹ️', ascii: 'i' },
  'loading':   { nf: '\u{F110}', emoji: '⏳', ascii: '~' },
  'play':      { nf: '\u{F04B}', emoji: '▶️', ascii: '▶' },
  'pause':     { nf: '\u{F04C}', emoji: '⏸️', ascii: '|' },
  'stop':      { nf: '\u{F04D}', emoji: '⏹️', ascii: '■' },
  'refresh':   { nf: '\u{F021}', emoji: '🔄', ascii: 'R' },
  'add':       { nf: '\u{F067}', emoji: '➕', ascii: '+' },
  'remove':    { nf: '\u{F068}', emoji: '➖', ascii: '-' },
  'heart':     { nf: '\u{F004}', emoji: '❤️', ascii: '♥' },
  'star':      { nf: '\u{F005}', emoji: '⭐', ascii: '★' },
  'rocket':    { nf: '\u{F135}', emoji: '🚀', ascii: 'R' },
  'satellite': { nf: '\u{EF5F}', emoji: '🛰️', ascii: 'S' },

  // --- Branding ---
  'bunti':  { nf: '\u{F08B5}', emoji: '🥟', ascii: 'B' },
  'github': { nf: '\u{F09B}', emoji: '🐙', ascii: 'G' },
  'git':    { nf: '\u{F1D3}', emoji: '🌿', ascii: 'G' },
  'bun':    { nf: '\u{E76F}', emoji: '🥟', ascii: 'B' },
  'npm':    { nf: '\u{E71E}', emoji: '📦', ascii: 'N' },
  'docker': { nf: '\u{F308}', emoji: '🐳', ascii: 'D' },
  'js':     { nf: '\u{E74E}', emoji: '🟨', ascii: 'J' },
  'ts':     { nf: '\u{E628}', emoji: '🟦', ascii: 'T' },
  'python': { nf: '\u{E73C}', emoji: '🐍', ascii: 'P' },
  'go':     { nf: '\u{E724}', emoji: '🐹', ascii: 'G' },
  'rust':   { nf: '\u{E7A8}', emoji: '🦀', ascii: 'R' },
  'node':   { nf: '\u{E718}', emoji: '🌲', ascii: 'N' },
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
  if (caps.unicode) return def.emoji;
  return def.ascii;
}

/**
 * Returns an opinionated icon with automatic fallback.
 */
export function icon(name: string): string {
  const caps = cachedCaps || { nerdFont: true, unicode: true };
  return getIcon(name, caps);
}

/**
 * Returns a specific Nerd Font icon by name from the registry.
 */
export function nerd(name: string): string {
  const caps = cachedCaps || { nerdFont: true, unicode: true };
  if (!caps.nerdFont) return '';
  return ICON_MAP[name]?.nf || customRegistry[name] || '';
}

/**
 * Registers a custom Nerd Font icon for use in the current session.
 */
export function register(name: string, glyph: string): void {
  customRegistry[name] = glyph;
}

export function nerdIcon(nfChar: string, fallback: string): string {
  const caps = cachedCaps || { nerdFont: true, unicode: true };
  return caps.nerdFont ? nfChar : fallback;
}
