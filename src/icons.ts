/**
 * Bunti Icon Engine
 * Purely tactical: Nerd Fonts or ASCII fallbacks.
 * 
 * STANDARD: Assumes Nerd Font support by default.
 * Detection runs in background and only downgrades if forced or highly certain.
 */
import { detectCapabilities, type TerminalCapabilities } from './detect';

export interface IconDefinition {
  nf: string;
  ascii: string;
}

export const ICON_MAP: Record<string, IconDefinition> = {
  'branch':   { nf: '\uf418', ascii: '*' },
  'pr':       { nf: '\uf41d', ascii: '!' },
  'commit':   { nf: '\uf417', ascii: '+' },
  'merge':    { nf: '\uf419', ascii: '>' },
  'fork':     { nf: '\uf41a', ascii: 'Y' },
  'tag':      { nf: '\uf412', ascii: 't' },
  'repo':     { nf: '\uf401', ascii: 'R' },
  'folder':      { nf: '\uf07b', ascii: '[' },
  'folder-open': { nf: '\uf115', ascii: '{' },
  'file':        { nf: '\uf15b', ascii: '-' },
  'code':        { nf: '\uf121', ascii: '{' },
  'markdown':    { nf: '\uf48a', ascii: 'M' },
  'json':        { nf: '\ue60b', ascii: 'J' },
  'yaml':        { nf: '\ue6a8', ascii: 'Y' },
  'cpu':      { nf: '\uf2db', ascii: 'C' },
  'memory':   { nf: '\uf538', ascii: 'M' },
  'disk':     { nf: '\uf0a0', ascii: 'D' },
  'network':  { nf: '\uf0ac', ascii: 'N' },
  'terminal': { nf: '\uf120', ascii: '$' },
  'database': { nf: '\uf1c0', ascii: 'D' },
  'server':   { nf: '\uf233', ascii: 'S' },
  'cloud':    { nf: '\uf0c2', ascii: 'C' },
  'maximize': { nf: '\uf2d0', ascii: '^' },
  'minimize': { nf: '\uf2d1', ascii: 'v' },
  'close':    { nf: '\uf00d', ascii: 'x' },
  'exit':     { nf: '\uf08b', ascii: '<' },
  'eye':      { nf: '\uf06e', ascii: 'v' },
  'eye-off':  { nf: '\uf070', ascii: 'h' },
  'list':     { nf: '\uf03a', ascii: '=' },
  'grid':     { nf: '\uf009', ascii: '#' },
  'external': { nf: '\uf08e', ascii: '>' },
  'lock':     { nf: '\uf023', ascii: 'L' },
  'settings': { nf: '\uf013', ascii: '*' },
  'search':   { nf: '\uf002', ascii: '/' },
  'home':     { nf: '\uf015', ascii: 'H' },
  'user':     { nf: '\uf007', ascii: 'U' },
  'chevron-left':  { nf: '\uf053', ascii: '<' },
  'chevron-right': { nf: '\uf054', ascii: '>' },
  'arrow-left':    { nf: '\uf060', ascii: '<' },
  'arrow-right':   { nf: '\uf061', ascii: '>' },
  'success':   { nf: '\uf00c', ascii: 'v' },
  'error':     { nf: '\uf00d', ascii: 'x' },
  'warning':   { nf: '\uf071', ascii: '!' },
  'info':      { nf: '\uf05a', ascii: 'i' },
  'loading':   { nf: '\uf110', ascii: '~' },
  'play':      { nf: '\uf04b', ascii: '>' },
  'pause':     { nf: '\uf04c', ascii: '|' },
  'stop':      { nf: '\uf04d', ascii: 'X' },
  'refresh':   { nf: '\uf021', ascii: 'R' },
  'add':       { nf: '\uf067', ascii: '+' },
  'remove':    { nf: '\uf068', ascii: '-' },
  'heart':     { nf: '\uf004', ascii: '*' },
  'star':      { nf: '\uf005', ascii: '*' },
  'rocket':    { nf: '\uf135', ascii: 'R' },
  'satellite': { nf: '\uef5f', ascii: 'S' },
  'bunti':  { nf: '\uf08b5', ascii: 'B' },
  'bun':    { nf: '\ue76f', ascii: 'B' },
  'node':   { nf: '\ue718', ascii: 'N' },
  'bullet': { nf: '\uf0522', ascii: '•' },
  'checkbox': { nf: '\uf0132', ascii: '[ ]' },
  'checkbox-check': { nf: '\uf0133', ascii: '[x]' },
};

/**
 * Mapping of common emojis to their closest Nerd Font v3 equivalents.
 */
export const EMOJI_MAP: Record<string, string> = {
  '🌿': '\uf418', '📥': '\uf41d', '📌': '\uf417', '🔀': '\uf419', '🍴': '\uf41a', '🏷️': '\uf412',
  '📁': '\uf07b', '📂': '\uf115', '📄': '\uf15b', '💻': '\uf121', '📝': '\uf48a', '📦': '\ue60b', '📜': '\ue6a8',
  '✅': '\uf00c', '❌': '\uf00d', '⚠️': '\uf071', 'ℹ️': '\uf05a', '⏳': '\uf110', '🚀': '\uf135', '🛰️': '\uef5f',
  '🥟': '\uf08b5', '🐙': '\uf09b', '🐳': '\uf308', '🐍': '\ue73c', '🐹': '\ue724', '🦀': '\ue7a8', '🌲': '\ue718',
  '🙂': '\uf118', '😊': '\uf118', '😀': '\uf118', '😄': '\uee80', '😉': '\ueda9', '😎': '\ueb54', '😇': '\uf4a2',
};

const GENERIC_ICON = '\uf0010';

export function replaceEmojis(text: string): string {
  if (!text) return '';
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  // @ts-ignore
  return Array.from(segmenter.segment(text)).map(({ segment }) => {
    if (EMOJI_MAP[segment]) return EMOJI_MAP[segment];
    const clean = segment.replace(/\uFE0F/g, '');
    if (EMOJI_MAP[clean]) return EMOJI_MAP[clean];
    if (/\p{Emoji_Presentation}/u.test(segment)) return GENERIC_ICON;
    return segment;
  }).join('');
}

// OPTIMISTIC PERSISTENCE: If NF is assumed or detected, it stays TRUE.
let cachedCaps: TerminalCapabilities = {
  nerdFont: true,
  glyphProtocol: false,
  unicode: true,
  color: true
};

let detectionStarted = false;

/**
 * Background detection that prioritizes the 'Optimistic' assumed state.
 */
export async function init(options?: { nerdFont?: boolean }): Promise<TerminalCapabilities> {
  if (options?.nerdFont !== undefined) {
    cachedCaps.nerdFont = options.nerdFont;
    return cachedCaps;
  }
  
  if (!detectionStarted) {
    detectionStarted = true;
    
    // Start background detection
    detectCapabilities().then(caps => {
      // ONLY UPDATE if the result is positive, or if we weren't already true.
      // We essentially "ignore" false negatives unless forced.
      if (caps.nerdFont) {
        cachedCaps.nerdFont = true;
      }
      cachedCaps.glyphProtocol = caps.glyphProtocol;
      cachedCaps.unicode = caps.unicode;
      cachedCaps.color = caps.color;
    });
  }

  return cachedCaps;
}

export function getIcon(name: string, caps: TerminalCapabilities): string {
  const def = ICON_MAP[name];
  if (!def) return '';
  // Use NF if assumed or detected
  if (caps.nerdFont) return def.nf;
  return def.ascii;
}

export function icon(name: string): string {
  return getIcon(name, cachedCaps);
}

export function nerd(name: string): string {
  if (!cachedCaps.nerdFont) return ICON_MAP[name]?.ascii || '';
  return ICON_MAP[name]?.nf || '';
}

export function register(name: string, glyph: string): void {
  // Optional registration
}

export function nerdIcon(nfChar: string, fallback: string): string {
  return cachedCaps.nerdFont ? nfChar : fallback;
}
