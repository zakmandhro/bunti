/**
 * Bunti Icon Engine
 * Purely tactical: Nerd Fonts or ASCII fallbacks.
 */
import type { TerminalCapabilities } from './detect';

export interface IconDefinition {
  nf: string;
  ascii: string;
}

export const ICON_MAP: Record<string, IconDefinition> = {
  add: { nf: '\uf067', ascii: '+' },
  'arrow-left': { nf: '\uf060', ascii: '<' },
  'arrow-right': { nf: '\uf061', ascii: '>' },
  bars: { nf: '\uf0c9', ascii: '≡' },
  bell: { nf: '\uf0f3', ascii: '!' },
  branch: { nf: '\uf418', ascii: '*' },
  bullet: { nf: '\uf111', ascii: '•' },
  bun: { nf: '\ue76f', ascii: 'B' },
  bunti: { nf: '\u{f0065}', ascii: '@' },
  check: { nf: '\uf00c', ascii: 'v' },
  checkbox: { nf: '\uf0c8', ascii: '[ ]' },
  'checkbox-check': { nf: '\uf14a', ascii: '[x]' },
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
  menu: { nf: '\uf0c9', ascii: '≡' },
  merge: { nf: '\uf419', ascii: '>' },
  minimize: { nf: '\u{f10fe}', ascii: 'v' },
  network: { nf: '\uf0ac', ascii: 'N' },
  node: { nf: '\ue718', ascii: 'N' },
  pause: { nf: '\uf04c', ascii: '|' },
  pencil: { nf: '\uf044', ascii: 'e' },
  planet: { nf: '\ue22e', ascii: '㊀' },
  play: { nf: '\uf04b', ascii: '>' },
  'plus-circle': { nf: '\uea60', ascii: '(+)' },
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
  'staggered-bars': { nf: '\u{ee19}', ascii: '≡' },
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
};

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
  '🛰️': 'satellite',
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

export function replaceEmojis(text: string): string {
  if (!text) return '';
  if (!cachedCaps.nerdFont) return text;

  let out = text;
  for (const [emoji, name] of Object.entries(EMOJI_MAP)) {
    const glyph = getIcon(name, cachedCaps);
    const regex = new RegExp(`${emoji}[\uFE00-\uFE0F]?`, 'g');
    out = out.replace(regex, glyph);
  }
  return out;
}

export async function init(options?: {
  nerdFont?: boolean;
}): Promise<TerminalCapabilities> {
  if (options?.nerdFont !== undefined) cachedCaps.nerdFont = options.nerdFont;
  return cachedCaps;
}

export function getIcon(name: string, caps: TerminalCapabilities): string {
  const def = ICON_MAP[name];
  if (!def) return '';
  return caps.nerdFont ? def.nf : def.ascii;
}

export function icon(name: string): string {
  return getIcon(name, cachedCaps);
}

export function nerd(name: string): string {
  return ICON_MAP[name]?.nf || '';
}

export function register(_name: string, _glyph: string): void {}

export function nerdIcon(nfChar: string, fallback: string): string {
  return cachedCaps.nerdFont ? nfChar : fallback;
}
