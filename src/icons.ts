import { detectCapabilities, type TerminalCapabilities } from './detect';

/**
 * Bunti Icon Engine
 */

export interface IconDefinition {
  nf: string;    // Nerd Font
  emoji: string; // Emoji fallback
  ascii: string; // ASCII fallback
}

export const ICON_MAP: Record<string, IconDefinition> = {
  'satellite': { nf: '\u{F086F}', emoji: '🛰️', ascii: '*' },
  'planet':    { nf: '\u{F0433}', emoji: '🌍', ascii: 'o' },
  'branch':    { nf: '\u{E725}',  emoji: '🌿', ascii: 'b' },
  'success':   { nf: '\u{F00C}',  emoji: '✅', ascii: 'v' },
  'error':     { nf: '\u{F00D}',  emoji: '❌', ascii: 'x' },
  'warning':   { nf: '\u{F071}',  emoji: '⚠️', ascii: '!' },
  'loading':   { nf: '\u{F0110}', emoji: '⏳', ascii: '~' },
  'issue':     { nf: '\u{F015F}', emoji: '📋', ascii: '#' },
  'pr':        { nf: '\u{F0699}', emoji: '📥', ascii: '>' },
  'pr-draft':  { nf: '\u{F0DBE}', emoji: '📄', ascii: 'd' },
  'agent':     { nf: '\u{F01D0}', emoji: '🤖', ascii: '@' },
  'shell':     { nf: '\u{F01D1}', emoji: '🐚', ascii: '$' },
  'rocket':    { nf: '\u{F135}',  emoji: '🚀', ascii: '^' },
  'github':    { nf: '\u{F09B}',  emoji: '🐙', ascii: 'G' },
  'lock':      { nf: '\u{F023}',  emoji: '🔒', ascii: 'L' },
  'terminal':  { nf: '\u{F489}',  emoji: '💻', ascii: '_' },
};

let cachedCaps: TerminalCapabilities | null = null;

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

export function icon(name: string): string {
  const caps = cachedCaps || { nerdFont: true, unicode: true };
  return getIcon(name, caps);
}

export function nerdIcon(nfChar: string, fallback: string): string {
  const caps = cachedCaps || { nerdFont: true, unicode: true };
  return caps.nerdFont ? nfChar : fallback;
}
