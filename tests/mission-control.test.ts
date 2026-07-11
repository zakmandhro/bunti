/**
 * Mission Control smoke tests: the launch hero demo must render a full
 * headless frame (--once) without crashing at both the minimum (80x24) and
 * showcase (120x40) viewports.
 */

import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';

const DEMO = resolve(import.meta.dir, '..', 'demo', 'mission-control.ts');

const ANSI_PATTERN = /\x1b(?:\[[0-9;?]*[a-zA-Z]|\][^\x07]*\x07)/g;

async function renderOnce(size: string) {
  const proc = Bun.spawn(['bun', DEMO, '--once', '--size', size], {
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { exitCode, stderr, plain: stdout.replace(ANSI_PATTERN, '') };
}

describe('mission-control demo', () => {
  test('renders a full frame headless at 80x24', async () => {
    const { exitCode, stderr, plain } = await renderOnce('80x24');
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(plain).toContain('AGENT FLEET');
    expect(plain).toContain('Agents');
    expect(plain).toContain('Mission Detail');
    expect(plain).toContain('Activity');
    expect(plain).toContain('q quit');
  }, 20_000);

  test('renders a full frame headless at 120x40', async () => {
    const { exitCode, stderr, plain } = await renderOnce('120x40');
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(plain).toContain('AGENT FLEET');
    expect(plain).toContain('FLEET THROUGHPUT');
    expect(plain).toContain('tok/min');
    expect(plain).toContain('1-8 themes');
  }, 20_000);

  test('shows the resize hint below the minimum viewport', async () => {
    const { exitCode, stderr, plain } = await renderOnce('60x16');
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(plain).toContain('mission control needs at least');
  }, 20_000);
});
