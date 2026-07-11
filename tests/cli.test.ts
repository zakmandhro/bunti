/**
 * CLI unit tests: argv parsing, demo listing, and the doctor report shape.
 * The CLI module only executes main() under import.meta.main, so importing
 * it here is side-effect free.
 */

import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  demoListLines,
  doctorReport,
  helpText,
  parseCliArgs,
} from '../src/cli';
import { findDemo, PUBLIC_DEMOS } from '../src/demo-registry';
import type { TerminalProfile } from '../src/detect';

describe('parseCliArgs', () => {
  test('no args -> help', () => {
    expect(parseCliArgs([])).toEqual({ cmd: 'help' });
  });

  test.each(['--help', '-h', 'help'])('%s -> help', (arg) => {
    expect(parseCliArgs([arg])).toEqual({ cmd: 'help' });
  });

  test.each(['--version', '-v', 'version'])('%s -> version', (arg) => {
    expect(parseCliArgs([arg])).toEqual({ cmd: 'version' });
  });

  test('doctor -> doctor', () => {
    expect(parseCliArgs(['doctor'])).toEqual({ cmd: 'doctor' });
  });

  test('demo with no name lists demos', () => {
    expect(parseCliArgs(['demo'])).toEqual({ cmd: 'list-demos' });
  });

  test('demo with a known name runs it', () => {
    expect(parseCliArgs(['demo', 'mission-control'])).toEqual({
      cmd: 'run-demo',
      name: 'mission-control',
    });
    expect(parseCliArgs(['demo', '2048'])).toEqual({
      cmd: 'run-demo',
      name: '2048',
    });
  });

  test('demo with an unknown name is rejected', () => {
    expect(parseCliArgs(['demo', 'nope'])).toEqual({
      cmd: 'unknown-demo',
      name: 'nope',
    });
  });

  test('unknown top-level command is rejected', () => {
    expect(parseCliArgs(['frobnicate'])).toEqual({
      cmd: 'unknown',
      arg: 'frobnicate',
    });
  });
});

describe('demo registry', () => {
  test('every registered demo source exists in demo/', () => {
    for (const demo of PUBLIC_DEMOS) {
      const path = join(import.meta.dir, '..', 'demo', demo.file);
      expect(existsSync(path)).toBe(true);
    }
  });

  test('mission-control is registered', () => {
    expect(findDemo('mission-control')?.file).toBe('mission-control.ts');
  });

  test('listing covers every public demo', () => {
    const listing = demoListLines().join('\n');
    for (const demo of PUBLIC_DEMOS) {
      expect(listing).toContain(demo.name);
      expect(listing).toContain(demo.description);
    }
  });

  test('help text carries the zero-install CTA', () => {
    expect(helpText('1.0.0')).toContain('bunx @zakmandhro/bunti demo');
    expect(helpText('1.0.0')).toContain('v1.0.0');
  });
});

describe('doctorReport', () => {
  const ghostty: TerminalProfile = {
    app: 'ghostty',
    version: '1.2.0',
    truecolor: true,
    syncOutput: true,
    nerdFont: 'yes',
    source: 'env',
  };

  test('reports app, version, tier, sync, and nerd font policy', () => {
    const report = doctorReport(ghostty, 'truecolor', '0.2.0', '1.3.14');
    expect(report[0]).toBe('bunti        v0.2.0 (bun 1.3.14)');
    expect(report[1]).toBe('terminal     ghostty 1.2.0');
    expect(report).toContain('colors       truecolor (24-bit)');
    expect(report).toContain('sync output  yes (mode 2026)');
    expect(report).toContain('nerd font    yes - glyphs enabled');
  });

  test('includes the multiplexer line only when present', () => {
    const plain = doctorReport(ghostty, 'truecolor', '0.2.0', '1.3.14');
    expect(plain.some((l) => l.startsWith('multiplexer'))).toBe(false);

    const inTmux = doctorReport(
      { ...ghostty, multiplexer: 'tmux' },
      'truecolor',
      '0.2.0',
      '1.3.14',
    );
    expect(inTmux).toContain('multiplexer  tmux');
  });

  test('unknown terminals fall back to the ascii icon tier', () => {
    const report = doctorReport(
      {
        app: 'unknown',
        truecolor: false,
        syncOutput: false,
        nerdFont: 'assumed-no',
        source: 'env',
      },
      '256',
      '0.2.0',
      '1.3.14',
    );
    expect(report).toContain('terminal     unknown');
    expect(report).toContain('colors       256 colors');
    expect(report).toContain('sync output  no');
    expect(report).toContain('nerd font    assumed no - ascii fallback');
  });

  test('marks a forced nerd font policy as an env override', () => {
    const report = doctorReport(
      { ...ghostty, nerdFont: 'no', source: 'override' },
      'truecolor',
      '0.2.0',
      '1.3.14',
    );
    expect(report).toContain('nerd font    no - ascii fallback (env override)');
  });
});
