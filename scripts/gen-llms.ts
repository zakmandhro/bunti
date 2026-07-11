/**
 * Generates llms.txt from the source JSDoc, so the file can never drift
 * from the real API: every one-liner below is extracted from the same
 * doc comments that ship in dist/*.d.ts. Fails (exit 1) if any listed
 * symbol loses its doc.
 *
 * Usage: bun scripts/gen-llms.ts        (writes ./llms.txt)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(import.meta.dir, '..');

/** The curated top-of-funnel API surface, in presentation order. */
const CONTEXT_MEMBERS = [
  'box',
  'text',
  'icon',
  'blit',
  'rect',
  'layer',
  'wallpaper',
  'gradient',
  'split',
  'useState',
  'useAsync',
  'lastKey',
  'keyPressed',
  'isKeyHeld',
  'hitbox',
  'isClicked',
  'isHovered',
  'list',
  'table',
  'theme',
  'setTheme',
  'animate',
  'transition',
  'stagger',
  'elapsedTime',
  'requestStop',
] as const;

function parse(file: string): ts.SourceFile {
  const path = resolve(ROOT, file);
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
  );
}

/** JSDoc comment text of a node ('' when absent). */
function docText(node: ts.Node): string {
  const jsDocs = (node as { jsDoc?: ts.JSDoc[] }).jsDoc;
  const comment = jsDocs?.[0]?.comment;
  if (comment === undefined) return '';
  return typeof comment === 'string'
    ? comment
    : comment.map((part) => part.text).join('');
}

/** First sentence of a doc comment, whitespace-collapsed, backticks kept. */
function firstSentence(doc: string): string {
  const collapsed = doc.replace(/\s+/g, ' ').trim();
  const match = collapsed.match(/^(.*?[.!?])(?:\s|$)/);
  return (match?.[1] ?? collapsed).trim();
}

/** Doc one-liners for the named members of an interface. */
function interfaceMemberDocs(
  source: ts.SourceFile,
  interfaceName: string,
  members: readonly string[],
): Map<string, string> {
  let iface: ts.InterfaceDeclaration | undefined;
  source.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      iface = node;
    }
  });
  if (!iface) throw new Error(`interface ${interfaceName} not found`);

  const docs = new Map<string, string>();
  for (const member of iface.members) {
    const name =
      member.name && ts.isIdentifier(member.name)
        ? member.name.text
        : undefined;
    if (!name || !members.includes(name) || docs.has(name)) continue;
    const doc = firstSentence(docText(member));
    if (doc) docs.set(name, doc); // overloads: first documented wins
  }
  return docs;
}

/** Doc one-liner for a top-level function declaration. */
function functionDoc(source: ts.SourceFile, name: string): string {
  let doc = '';
  source.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      doc = firstSentence(docText(node));
    }
  });
  return doc;
}

// --- Extract ---

const typesSource = parse('src/dsl/types.ts');
const renderSource = parse('src/dsl/render.ts');

const contextDocs = interfaceMemberDocs(
  typesSource,
  'BuntiContext',
  CONTEXT_MEMBERS,
);
const renderDoc = functionDoc(renderSource, 'render');

const missing: string[] = [];
if (!renderDoc) missing.push('render (src/dsl/render.ts)');
for (const member of CONTEXT_MEMBERS) {
  if (!contextDocs.get(member)) {
    missing.push(`BuntiContext.${member} (src/dsl/types.ts)`);
  }
}
if (missing.length > 0) {
  console.error('gen-llms: missing JSDoc for:');
  for (const entry of missing) console.error(`  - ${entry}`);
  process.exit(1);
}

// --- Compose ---

const apiLines = CONTEXT_MEMBERS.map(
  (member) => `- ctx.${member} — ${contextDocs.get(member)}`,
).join('\n');

const llms = `# Bunti

> A Bun-native terminal UI engine with zero dependencies: 60fps
> double-buffered diff rendering, an immediate-mode contextual DSL,
> semantic themes (6 VS Code presets), mouse + keyboard input, motion
> helpers, and a 10.7k-name Nerd Font icon registry. Built to be the
> easiest TUI library for coding agents.

Requires the Bun runtime (>= 1.0); Node.js is not supported.

## Install

\`\`\`bash
bun add @zakmandhro/bunti
\`\`\`

## Mental model

- render — ${renderDoc}
- One frame = one callback: read input, derive state with
  ctx.useState(key, initial), draw everything. Never mutate the
  terminal yourself.
- Coordinates are terminal cells, local to the current context (the
  whole screen at the root; the padded interior inside a box).
  padding is [vertical, horizontal]. ctx.elapsedTime is milliseconds.
- Root-level boxes paint directly to the screen and CENTER themselves
  unless given x/y. Anything that must overlap other content goes in
  ctx.layer(zIndex, cb) — draw order alone does not stack.
- Keyboard input ({ keyboard: true }) needs a real TTY on stdin; piped
  input is ignored. Printable keys arrive as the literal character,
  specials as lowercase names ('up', 'enter'), mouse as
  'click'/'wheel_up'/'wheel_down'.

## Core API (ctx is the object your render callback receives)

${apiLines}

## Components ('@zakmandhro/bunti/components')

Box, Card, Button, Input, Modal, Spinner, Progress, Link, Header —
call as functions: Button(ctx, { id, label, onClick }).

## Themes ('@zakmandhro/bunti/themes')

dracula, tokyoNight, catppuccinMocha, nord, oneDarkPro, githubLight;
ctx.setTheme(dracula) swaps live. createTheme({...}) derives full
themes from sparse color specs.

## More

- Full typed API with examples ships in the package's dist/*.d.ts.
- Agent playbook: AGENTS.md (in this package).
- Starter template: https://github.com/zakmandhro/bunti/blob/main/examples/starter.ts
- Docs: https://zakmandhro.github.io/bunti/
`;

writeFileSync(resolve(ROOT, 'llms.txt'), llms);
console.log(`llms.txt written (${llms.length} bytes)`);
