#!/usr/bin/env bun
/**
 * Nerd Fonts icon codegen for Bunti.
 *
 * Downloads the pinned glyphnames.json from the official nerd-fonts repo and
 * emits:
 *   - src/data/nf-names.ts   IconName string-literal union (~10.7k members)
 *   - src/data/nf-glyphs.ts  NF_GLYPHS: Record<IconName, string> name->char map
 *
 * Validation: every glyph must be a single Unicode code point and render at
 * terminal width 1 (Bun.stringWidth). Width-2 outliers (e.g. oct-zap, which is
 * the U+26A1 emoji) are warned about and skipped so tier switches never shift
 * layout.
 *
 * Regenerate with: bun scripts/gen-icons.ts
 */

const NF_VERSION = 'v3.4.0';
const SOURCE_URL = `https://raw.githubusercontent.com/ryanoasis/nerd-fonts/${NF_VERSION}/glyphnames.json`;

const OUT_DIR = new URL('../src/data/', import.meta.url).pathname;
const GLYPHS_OUT = `${OUT_DIR}nf-glyphs.ts`;
const NAMES_OUT = `${OUT_DIR}nf-names.ts`;

interface GlyphEntry {
  char: string;
  code: string;
}

console.log(`Fetching ${SOURCE_URL} ...`);
const res = await fetch(SOURCE_URL);
if (!res.ok) {
  console.error(`Download failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const raw = (await res.json()) as Record<string, GlyphEntry | unknown>;

const names: string[] = [];
const glyphs = new Map<string, string>();
const skipped: Array<{ name: string; reason: string }> = [];
let total = 0;

for (const [name, value] of Object.entries(raw)) {
  if (name === 'METADATA') continue; // top-level metadata key, not a glyph
  total++;

  const entry = value as GlyphEntry;
  if (typeof entry?.char !== 'string' || entry.char.length === 0) {
    skipped.push({ name, reason: 'missing char' });
    continue;
  }

  const codePoints = [...entry.char];
  if (codePoints.length !== 1) {
    skipped.push({
      name,
      reason: `multiple code points (${codePoints.length})`,
    });
    continue;
  }

  const width = Bun.stringWidth(entry.char);
  if (width !== 1) {
    const cp = entry.char.codePointAt(0)?.toString(16).toUpperCase();
    skipped.push({ name, reason: `width ${width} (U+${cp})` });
    continue;
  }

  names.push(name);
  glyphs.set(name, entry.char);
}

names.sort();

// --- Emit nf-names.ts (IconName union) ---
const header = (what: string) => `/**
 * GENERATED FILE - do not edit by hand.
 * ${what}
 * Source: Nerd Fonts ${NF_VERSION} glyphnames.json
 * Regenerate: bun scripts/gen-icons.ts
 */
`;

const unionLines: string[] = [];
{
  let line = '';
  for (const name of names) {
    const piece = `| ${JSON.stringify(name).replace(/"/g, "'")} `;
    if (line.length + piece.length > 500) {
      unionLines.push(line.trimEnd());
      line = '';
    }
    line += piece;
  }
  if (line) unionLines.push(line.trimEnd());
}

const namesSrc = `${header('Nerd Fonts icon name union (all glyphs, by name).')}export type IconName =
${unionLines.join('\n')};
`;

// --- Emit nf-glyphs.ts (name -> char map) ---
const mapLines: string[] = [];
{
  let line = '';
  for (const name of names) {
    // JSON.stringify keeps PUA glyph chars raw (UTF-8), only escaping controls.
    const piece = `${JSON.stringify(name).replace(/"/g, "'")}:${JSON.stringify(
      glyphs.get(name),
    ).replace(/"/g, "'")},`;
    if (line.length + piece.length > 500) {
      mapLines.push(line);
      line = '';
    }
    line += piece;
  }
  if (line) mapLines.push(line);
}

const glyphsSrc = `${header(
  'Full Nerd Fonts name -> glyph map. Loaded only via the icons-full subpath.',
)}import type { IconName } from './nf-names';

export type { IconName } from './nf-names';

export const NF_GLYPHS: Record<IconName, string> = {
${mapLines.join('\n')}
};

export const NF_VERSION = '${NF_VERSION}';
`;

await Bun.write(NAMES_OUT, namesSrc);
await Bun.write(GLYPHS_OUT, glyphsSrc);

// --- Report ---
console.log(`\nNerd Fonts ${NF_VERSION} codegen complete`);
console.log(`  total glyph entries : ${total}`);
console.log(`  emitted             : ${names.length}`);
console.log(`  skipped             : ${skipped.length}`);
for (const s of skipped) {
  console.warn(`    - ${s.name}: ${s.reason}`);
}
const glyphsBytes = Buffer.byteLength(glyphsSrc);
const namesBytes = Buffer.byteLength(namesSrc);
console.log(`  ${GLYPHS_OUT}: ${(glyphsBytes / 1024).toFixed(1)} KB`);
console.log(`  ${NAMES_OUT}: ${(namesBytes / 1024).toFixed(1)} KB`);
const gz = Bun.gzipSync(Buffer.from(glyphsSrc));
console.log(`  nf-glyphs.ts gzip: ${(gz.byteLength / 1024).toFixed(1)} KB`);
