/**
 * Bunti ESM Specifier Rewriter
 *
 * Ensures all relative imports and exports in compiled dist/ files have explicit
 * `.js` extensions for full compatibility with Node.js ESM loader.
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const distDir = resolve(import.meta.dir, '..', 'dist');

function walk(dir: string, fileList: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Don't recurse into demos (they are built separately by build-demos.ts)
      if (entry !== 'demos') walk(full, fileList);
    } else if (full.endsWith('.js') || full.endsWith('.d.ts')) {
      fileList.push(full);
    }
  }
  return fileList;
}

export function fixDistImports(): number {
  if (!existsSync(distDir)) {
    console.error('fix-esm-imports: dist/ directory does not exist');
    process.exit(1);
  }

  const files = walk(distDir);
  let totalFixes = 0;

  for (const file of files) {
    const dir = dirname(file);
    const content = readFileSync(file, 'utf-8');

    let fileFixes = 0;
    const updated = content.replace(
      /((?:(?:import|export)\s+(?:[\s\S]*?from\s+)?|import\s*\(\s*)['"])(\.[^'"]+)(['"])/g,
      (match, prefix, specifier, suffix) => {
        if (
          specifier.endsWith('.js') ||
          specifier.endsWith('.json') ||
          specifier.endsWith('.node')
        ) {
          return match;
        }

        const target = resolve(dir, specifier);
        let replacement = specifier;

        if (existsSync(`${target}.js`) || existsSync(`${target}.d.ts`)) {
          replacement = `${specifier}.js`;
        } else if (
          existsSync(join(target, 'index.js')) ||
          existsSync(join(target, 'index.d.ts'))
        ) {
          replacement = `${specifier}/index.js`;
        } else {
          return match;
        }

        fileFixes++;
        return `${prefix}${replacement}${suffix}`;
      },
    );

    if (fileFixes > 0) {
      writeFileSync(file, updated, 'utf-8');
      totalFixes += fileFixes;
    }
  }

  console.log(
    `fix-esm-imports: resolved ${totalFixes} ESM import extensions across dist/`,
  );
  return totalFixes;
}

fixDistImports();
