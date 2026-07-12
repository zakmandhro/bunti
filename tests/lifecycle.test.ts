/**
 * Lifecycle & crash-safety tests.
 *
 * A crashing Bunti app must NEVER leave the user's terminal broken (raw
 * mode, hidden cursor, alt buffer, mouse tracking left on). Most of these
 * tests spawn real Bun subprocesses running fixture apps (tests/fixtures/*)
 * and assert on their stdout/stderr/exit codes, because teardown behavior
 * only fully exists at the process boundary.
 */

import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { loop, restoreTerminal } from '../src/render';
import { createScreenState, type ScreenState } from '../src/state';

const FIXTURES_DIR = resolve(import.meta.dir, 'fixtures');

/** Restore sequence emitted for { alternateBuffer: true, hideCursor: true }. */
const RESTORE_TAIL = '\x1b[0m\x1b[2J\x1b[H\x1b[?1049l\x1b[?25h\x1b[0m';

/** Restore sequence emitted for default options (main buffer). */
const RESTORE_PLAIN = '\x1b[0m\x1b[2J\x1b[H\x1b[?25h\x1b[0m';

const PROCESS_EVENTS = [
  'uncaughtException',
  'unhandledRejection',
  'exit',
  'SIGHUP',
  'SIGINT',
  'SIGTERM',
  'SIGWINCH',
] as const;

interface FixtureResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runFixture(
  name: string,
  timeoutMs = 15000,
): Promise<FixtureResult> {
  const proc = Bun.spawn(['bun', resolve(FIXTURES_DIR, name)], {
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const timer = setTimeout(() => proc.kill(), timeoutMs);
  const exitCode = await proc.exited;
  clearTimeout(timer);
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Silences process.stdout.write for the duration of fn (in-process tests). */
async function withMutedStdout(fn: (writes: string[]) => Promise<void> | void) {
  const writes: string[] = [];
  const target = process.stdout as unknown as {
    write: (chunk: string | Uint8Array) => boolean;
  };
  const original = target.write;
  target.write = (chunk: string | Uint8Array) => {
    writes.push(String(chunk));
    return true;
  };
  try {
    await fn(writes);
  } finally {
    target.write = original;
  }
}

/**
 * Render callback for in-process loop() tests: blanks the back buffer so
 * flush() diffs to zero and writes nothing to the real test terminal.
 */
function blankFrame(s: ScreenState) {
  for (const cell of s.backBuffer) {
    cell.char = '';
    cell.skip = false;
  }
}

describe('crash safety (subprocess fixtures)', () => {
  test('throw inside the render callback: restores terminal, exits 1, reports once', async () => {
    const { exitCode, stdout, stderr } = await runFixture('crash-in-render.ts');

    expect(exitCode).toBe(1);
    // Entered the alt buffer and actually rendered before crashing.
    expect(stdout).toContain('\x1b[?1049h');
    expect(stdout).toContain('FRAME');
    // Restore sequence is the LAST thing on stdout, after the frame output.
    expect(stdout.endsWith(RESTORE_TAIL)).toBe(true);
    expect(stdout.lastIndexOf('\x1b[?1049l')).toBeGreaterThan(
      stdout.indexOf('FRAME'),
    );
    expect(stdout.lastIndexOf('\x1b[?25h')).toBeGreaterThan(
      stdout.indexOf('FRAME'),
    );
    // The error surfaced through the rejected render() promise, not by the
    // library calling process.exit — code after the await never ran.
    expect(stdout).not.toContain('UNREACHABLE');
    // Exactly one clean report on the main screen.
    expect(countOccurrences(stderr, 'render-crash-marker')).toBe(1);
  });

  test('async throw outside the tick: restores terminal, exits 1, reports once', async () => {
    const { exitCode, stdout, stderr } = await runFixture('crash-async.ts');

    expect(exitCode).toBe(1);
    expect(stdout).toContain('\x1b[?1049h');
    expect(stdout).toContain('FRAME');
    expect(stdout.endsWith(RESTORE_TAIL)).toBe(true);
    expect(stdout.lastIndexOf('\x1b[?1049l')).toBeGreaterThan(
      stdout.indexOf('FRAME'),
    );
    expect(stdout).not.toContain('UNREACHABLE');
    expect(countOccurrences(stderr, 'async-crash-marker')).toBe(1);
  });

  test('once mode: resolves without process.exit and the host process continues', async () => {
    const { exitCode, stdout, stderr } = await runFixture('once-mode.ts');

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('ONCE-FRAME');
    // Code AFTER `await render(...)` ran — the library did not kill the host.
    expect(stdout.endsWith('AFTER_RENDER\n')).toBe(true);
    // Once mode never touches the alternate buffer.
    expect(stdout).not.toContain('\x1b[?1049h');
  });

  test('double render(): second call throws the guard error, first keeps working', async () => {
    const { exitCode, stdout, stderr } = await runFixture('double-render.ts');

    expect(exitCode).toBe(0);
    expect(stderr).toContain('GUARD:');
    expect(stderr).toContain('already active');
    expect(stderr).not.toContain('NO_GUARD');
    // First loop survived the guarded call and stopped cleanly afterwards.
    expect(stdout).toContain('DONE');
  });

  test('clean quit via requestStop: restore sequence then exit 0', async () => {
    const { exitCode, stdout, stderr } = await runFixture('clean-quit.ts');

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    const restoreIndex = stdout.lastIndexOf(RESTORE_TAIL);
    expect(restoreIndex).toBeGreaterThan(-1);
    expect(stdout.indexOf('CLEAN_EXIT')).toBeGreaterThan(restoreIndex);
    expect(stdout.endsWith('CLEAN_EXIT\n')).toBe(true);
  });

  test('final frame before requestStop is flushed and visible', async () => {
    const { exitCode, stdout, stderr } = await runFixture('final-frame.ts');

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    // The frame painted on the same tick as requestStop reached the
    // terminal: both the flow text and the direct blit are on stdout.
    expect(stdout).toContain('FINAL-FRAME-MARKER');
    expect(stdout).toContain('FINAL-BLIT-MARKER');
    // ...and it was flushed BEFORE the restore sequence tore the screen down.
    expect(stdout.lastIndexOf(RESTORE_TAIL)).toBeGreaterThan(
      stdout.indexOf('FINAL-FRAME-MARKER'),
    );
    expect(stdout.endsWith('FINAL_EXIT\n')).toBe(true);
  });

  test("onError returning 'continue' keeps the loop alive after a frame error", async () => {
    const { exitCode, stdout } = await runFixture('onerror-continue.ts');

    expect(exitCode).toBe(0);
    expect(stdout).toContain('SURVIVED:1');
  });

  test('process handlers do not accumulate across render cycles', async () => {
    const { exitCode, stderr } = await runFixture('listener-cleanup.ts');

    expect(exitCode).toBe(0);
    const report = JSON.parse(stderr.trim()) as {
      baseline: Record<string, number>;
      during: Record<string, number>;
      after: Record<string, number>;
    };
    for (const event of PROCESS_EVENTS) {
      expect(`${event}:${report.during[event]}`).toBe(
        `${event}:${report.baseline[event]! + 1}`,
      );
      expect(`${event}:${report.after[event]}`).toBe(
        `${event}:${report.baseline[event]}`,
      );
    }
  });
});

describe('crash safety (in-process)', () => {
  test('restoreTerminal is idempotent per screen session', async () => {
    const state = createScreenState({
      alternateBuffer: true,
      hideCursor: true,
    });
    await withMutedStdout((writes) => {
      restoreTerminal(state);
      restoreTerminal(state);
      expect(writes).toEqual([RESTORE_TAIL]);
    });
    expect(state.isRestored).toBe(true);
  });

  test('restoreTerminal includes mouse/focus disables when enabled', async () => {
    const state = createScreenState({ mouse: true, focus: true });
    await withMutedStdout((writes) => {
      restoreTerminal(state);
      expect(writes).toEqual([
        `\x1b[?1003l\x1b[?1006l\x1b[?1004l${RESTORE_PLAIN}`,
      ]);
    });
  });

  test('loop() rejects concurrent starts and stop() is idempotent', async () => {
    await withMutedStdout(async () => {
      const first = createScreenState({ fps: 240 });
      let frames = 0;
      const running = loop(first, (s) => {
        blankFrame(s);
        frames += 1;
        if (frames >= 3) {
          s.requestStop?.();
          s.requestStop?.(); // second call must be a no-op
        }
      });

      const second = createScreenState();
      expect(() => loop(second, blankFrame)).toThrow(/already active/);

      await running;
      expect(first.isStopped).toBe(true);
      expect(first.isRestored).toBe(true);
    });
  });

  test('render cycles restore process listener counts to baseline (twice)', async () => {
    const baseline = PROCESS_EVENTS.map((e) => process.listenerCount(e));
    await withMutedStdout(async () => {
      for (let i = 0; i < 2; i++) {
        const state = createScreenState({ fps: 240 });
        await loop(state, (s) => {
          blankFrame(s);
          s.requestStop?.();
        });
      }
    });
    expect(PROCESS_EVENTS.map((e) => process.listenerCount(e))).toEqual(
      baseline,
    );
  });

  test('a frame error tears down, restores, and rejects the loop promise', async () => {
    await withMutedStdout(async (writes) => {
      const state = createScreenState({
        alternateBuffer: true,
        hideCursor: true,
        fps: 240,
      });
      const failure = new Error('frame-explosion');
      let rejected: unknown;
      try {
        await loop(state, () => {
          throw failure;
        });
      } catch (err) {
        rejected = err;
      }
      expect(rejected).toBe(failure);
      expect(state.isStopped).toBe(true);
      expect(state.isRestored).toBe(true);
      expect(writes.join('')).toContain(RESTORE_TAIL);
    });
  });
});
