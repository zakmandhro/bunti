#!/usr/bin/env bun

/**
 * The `bunti` CLI — the zero-install front door:
 *
 *   bunx @zakmandhro/bunti demo                  list the public demos
 *   bunx @zakmandhro/bunti demo mission-control  run one
 *   bunx @zakmandhro/bunti doctor                terminal capability report
 *   bunx @zakmandhro/bunti --version
 *
 * Demos are plain Bun-runnable TypeScript copied into dist/demos/ at build
 * time (see scripts/build-demos.ts); `demo <name>` simply imports one, which
 * starts its render loop in-process.
 */

import { findDemo, PUBLIC_DEMOS } from './demo-registry';
import {
  type ColorTier,
  detectColorTier,
  identifyTerminal,
  type TerminalProfile,
} from './detect';

export type CliCommand =
  | { cmd: 'help' }
  | { cmd: 'version' }
  | { cmd: 'doctor' }
  | { cmd: 'list-demos' }
  | { cmd: 'run-demo'; name: string }
  | { cmd: 'unknown-demo'; name: string }
  | { cmd: 'unknown'; arg: string };

/** Pure argv parser (argv excludes the runtime + script entries). */
export function parseCliArgs(argv: string[]): CliCommand {
  const [first, second] = argv;
  if (
    first === undefined ||
    first === 'help' ||
    first === '--help' ||
    first === '-h'
  ) {
    return { cmd: 'help' };
  }
  if (first === 'version' || first === '--version' || first === '-v') {
    return { cmd: 'version' };
  }
  if (first === 'doctor') return { cmd: 'doctor' };
  if (first === 'demo') {
    if (second === undefined) return { cmd: 'list-demos' };
    if (findDemo(second)) return { cmd: 'run-demo', name: second };
    return { cmd: 'unknown-demo', name: second };
  }
  return { cmd: 'unknown', arg: first };
}

/** `name  description` listing lines for the public demos. */
export function demoListLines(): string[] {
  const pad = Math.max(...PUBLIC_DEMOS.map((d) => d.name.length)) + 2;
  return PUBLIC_DEMOS.map((d) => `  ${d.name.padEnd(pad)}${d.description}`);
}

export function helpText(version: string): string {
  return [
    `bunti v${version} — Bun-native terminal UI engine`,
    '',
    'Usage:',
    '  bunti demo               list the public demos',
    '  bunti demo <name>        run a demo',
    '  bunti doctor             terminal capability report',
    '  bunti --version          print the version',
    '',
    'Demos:',
    ...demoListLines(),
    '',
    'Zero-install: bunx @zakmandhro/bunti demo mission-control',
  ].join('\n');
}

/**
 * The `bunti doctor` report: env-detected terminal profile, color tier, and
 * the Nerd Font policy driving the icon engine. Pure function of its inputs
 * so tests can pin the exact shape.
 */
export function doctorReport(
  profile: TerminalProfile,
  tier: ColorTier,
  version: string,
  bunVersion: string,
): string[] {
  const terminal =
    profile.app === 'unknown'
      ? 'unknown'
      : `${profile.app}${profile.version ? ` ${profile.version}` : ''}`;
  const tierLabel =
    tier === 'truecolor'
      ? 'truecolor (24-bit)'
      : tier === '256'
        ? '256 colors'
        : tier === '16'
          ? '16 colors'
          : 'monochrome';
  const nf: Record<TerminalProfile['nerdFont'], string> = {
    yes: 'yes - glyphs enabled',
    'assumed-yes': 'assumed yes - glyphs enabled',
    'assumed-no': 'assumed no - ascii fallback',
    no: 'no - ascii fallback',
  };
  const lines = [
    `bunti        v${version} (bun ${bunVersion})`,
    `terminal     ${terminal}`,
  ];
  if (profile.multiplexer) lines.push(`multiplexer  ${profile.multiplexer}`);
  lines.push(
    `colors       ${tierLabel}`,
    `sync output  ${profile.syncOutput ? 'yes (mode 2026)' : 'no'}`,
    `nerd font    ${nf[profile.nerdFont]}${
      profile.source === 'override' ? ' (env override)' : ''
    }`,
  );
  return lines;
}

async function packageVersion(): Promise<string> {
  try {
    const pkg = await Bun.file(
      new URL('../package.json', import.meta.url),
    ).json();
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function runDemo(file: string): Promise<void> {
  // Published layout: dist/cli.js + dist/demos/*.ts. Dev layout (running
  // src/cli.ts directly): ../demo/*.ts. Prefer the packaged copy.
  const packaged = new URL(`./demos/${file}`, import.meta.url);
  const dev = new URL(`../demo/${file}`, import.meta.url);
  const target = (await Bun.file(packaged).exists()) ? packaged : dev;
  await import(target.href);
}

async function main(): Promise<void> {
  const command = parseCliArgs(process.argv.slice(2));
  switch (command.cmd) {
    case 'help':
      console.log(helpText(await packageVersion()));
      return;
    case 'version':
      console.log(await packageVersion());
      return;
    case 'doctor': {
      const report = doctorReport(
        identifyTerminal(),
        detectColorTier(),
        await packageVersion(),
        Bun.version,
      );
      console.log(report.join('\n'));
      return;
    }
    case 'list-demos':
      console.log('Public demos:\n');
      console.log(demoListLines().join('\n'));
      console.log('\nRun one: bunti demo <name>');
      return;
    case 'run-demo': {
      const entry = findDemo(command.name);
      if (entry) await runDemo(entry.file);
      return;
    }
    case 'unknown-demo':
      console.error(`Unknown demo "${command.name}". Available demos:\n`);
      console.error(demoListLines().join('\n'));
      process.exitCode = 1;
      return;
    case 'unknown':
      console.error(`Unknown command "${command.arg}". Try: bunti --help`);
      process.exitCode = 1;
      return;
  }
}

if (import.meta.main) {
  await main();
}
