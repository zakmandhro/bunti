/**
 * Bunti Demo Smoke Tests
 *
 * Runs every public demo headlessly (stdin/stdout detached) for a few
 * seconds. A demo PASSES if it either survives until the timeout (still
 * rendering, then killed) or exits cleanly with code 0. A demo FAILS if it
 * exits non-zero or writes anything to stderr.
 *
 * Usage: bun run smoke
 */

import { resolve } from 'node:path';
import { PUBLIC_DEMOS } from '../src/demo-registry';

const TIMEOUT_MS = 8000;

interface SmokeResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function smokeDemo(name: string, file: string): Promise<SmokeResult> {
  const demoPath = resolve(import.meta.dir, '..', 'demo', file);
  let timedOut = false;

  const proc = Bun.spawn(['bun', demoPath], {
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'pipe',
  });

  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, TIMEOUT_MS);

  const exitCode = await proc.exited;
  clearTimeout(timer);

  const stderr = (await new Response(proc.stderr).text()).trim();

  if (stderr.length > 0) {
    return { name, ok: false, detail: `stderr: ${stderr.slice(0, 400)}` };
  }
  if (timedOut) {
    return { name, ok: true, detail: `alive at ${TIMEOUT_MS}ms (killed)` };
  }
  if (exitCode === 0) {
    return { name, ok: true, detail: 'exited cleanly (0)' };
  }
  return { name, ok: false, detail: `exit code ${exitCode}` };
}

console.log(`Smoke testing ${PUBLIC_DEMOS.length} public demos ...\n`);

let failures = 0;
for (const demo of PUBLIC_DEMOS) {
  const result = await smokeDemo(demo.name, demo.file);
  const status = result.ok ? 'PASS' : 'FAIL';
  if (!result.ok) failures++;
  console.log(`  ${status}  ${result.name.padEnd(16)} ${result.detail}`);
}

if (failures > 0) {
  console.log(`\n${failures} demo(s) failed.`);
  process.exit(1);
}

console.log('\nAll demos passed.');
