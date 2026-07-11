import { resolve } from 'node:path';
import { spawn } from 'bun';

/**
 * Bunti Demo Watchdog
 * Uses `bun --watch` in a child process to provide clean, zero-leak reloads.
 */

const target = process.argv.find(
  (arg) =>
    !arg.startsWith('--') &&
    !arg.includes('/') &&
    arg !== 'bun' &&
    !arg.endsWith('.ts') &&
    arg !== 'node',
);

const isNoHot = process.argv.includes('--no-hot');

const publicDemos: Record<string, string> = {
  2048: './2048.ts',
  animation: './animation.ts',
  interaction: './interaction.ts',
  dashboard: './dashboard.ts',
  engine: './engine.ts',
  login: './login.ts',
  showcase: './showcase.ts',
};

const internalDemos: Record<string, string> = {
  gallery: './gallery.ts',
  layout: './layout.ts',
  colors: './colors.ts',
  responsive: './responsive.ts',
  'color-isolation': './color-isolation.ts',
  'theme-preview': './theme-preview.ts',
};

const registry = { ...publicDemos, ...internalDemos };

if (!target || !registry[target]) {
  console.log(`\n🥟  BUNTI RUNNER`);
  console.log(`Usage: bun demo <name>\n`);
  console.log(`Public Demos:`);
  for (const k of Object.keys(publicDemos)) {
    console.log(`  - ${k}`);
  }
  console.log(`\nInternal Demos:`);
  for (const k of Object.keys(internalDemos)) {
    console.log(`  - ${k}`);
  }
  process.exit(1);
}

const demoPath = resolve(import.meta.dir, registry[target]!);

// Signal to the engine that we are in WATCH mode
process.env.BUNTI_WATCH = 'true';

const args = ['bun'];
if (!isNoHot) args.push('--watch');
args.push(demoPath);

const proc = spawn(args, {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
});

// Handle termination signals in the parent runner
let isShuttingDown = false;
const cleanup = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  proc.kill('SIGINT');
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const exitCode = await proc.exited;
process.removeListener('SIGINT', cleanup);
process.removeListener('SIGTERM', cleanup);

process.exit(exitCode === 130 || isShuttingDown ? 0 : exitCode);
