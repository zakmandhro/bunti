/**
 * Packages the public demos into dist/demos/ so the published tarball can
 * run them (`bunx @zakmandhro/bunti demo <name>`).
 *
 * Demos stay plain TypeScript — Bun runs .ts natively and the CLI's shebang
 * pins Bun — but their '../src/...' imports are rewritten to the compiled
 * dist layout ('../index.js', '../components/index.js', ...). Also marks
 * dist/cli.js executable, since tsc does not preserve file modes.
 *
 * Runs as the second half of `bun run build`.
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { DEMO_HELPERS, PUBLIC_DEMOS } from '../src/demo-registry';

const root = resolve(import.meta.dir, '..');
const demoDir = join(root, 'demo');
const outDir = join(root, 'dist', 'demos');
const cliPath = join(root, 'dist', 'cli.js');

function rewriteImports(source: string, file: string): string {
  const rewritten = source
    // '../src' and '../src/index' -> the package entry barrel.
    .replace(/from '\.\.\/src(?:\/index)?'/g, "from '../index.js'")
    // '../src/<path>' -> '../<path>.js' (or '/index.js' for directories).
    .replace(/from '\.\.\/src\/([^']+)'/g, (_match, p: string) => {
      const asDir = join(root, 'src', p);
      if (existsSync(asDir) && statSync(asDir).isDirectory()) {
        return `from '../${p}/index.js'`;
      }
      return `from '../${p}.js'`;
    })
    // Local demo helpers: './demo-layout' -> './demo-layout.js'
    .replace(/from '\.\/demo-layout'/g, "from './demo-layout.js'")
    .replace(
      /from '\.\/platformer-physics'/g,
      "from './platformer-physics.js'",
    );

  if (rewritten.includes("'../src")) {
    console.error(`build-demos: unrewritten src import left in ${file}`);
    process.exit(1);
  }
  return rewritten;
}

mkdirSync(outDir, { recursive: true });

const transpiler = new Bun.Transpiler({ loader: 'ts' });
const files = [...PUBLIC_DEMOS.map((d) => d.file), ...DEMO_HELPERS];
for (const file of files) {
  const source = readFileSync(join(demoDir, file), 'utf-8');
  const rewritten = rewriteImports(source, file);
  writeFileSync(join(outDir, file), rewritten);

  // Emit .js companion for Node execution
  const jsFile = file.replace(/\.ts$/, '.js');
  const jsSource = transpiler.transformSync(rewritten);
  writeFileSync(join(outDir, jsFile), jsSource);
}

if (!existsSync(cliPath)) {
  console.error('build-demos: dist/cli.js missing — run tsc first');
  process.exit(1);
}
const shebang = readFileSync(cliPath, 'utf-8').slice(0, 30);
if (
  !shebang.startsWith('#!/usr/bin/env node') &&
  !shebang.startsWith('#!/usr/bin/env bun')
) {
  console.error('build-demos: dist/cli.js lost its shebang');
  process.exit(1);
}
chmodSync(cliPath, 0o755);

console.log(
  `build-demos: packaged ${files.length} demos (.ts + .js) into dist/demos/`,
);
