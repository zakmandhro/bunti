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

const registry: Record<string, string> = {
  gallery: './gallery.ts',
  responsive: './responsive.ts',
  interaction: './interaction.ts',
  dashboard: './dashboard.ts',
  engine: './engine.ts',
  animation: './animation.ts',
  layout: './layout.ts',
  colors: './colors.ts',
  'color-isolation': './color-isolation.ts',
  login: './login.ts',
};

if (!target || !registry[target]) {
  console.log(`\n🛰️  BUNTI RUNNER`);
  console.log(`Usage: bun demo <name>\n`);
  console.log(`Available Demos:`);
  for (const k of Object.keys(registry)) {
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
const cleanup = () => {
  proc.kill('SIGINT');
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const exitCode = await proc.exited;
process.exit(exitCode);
