/**
 * Held-key spike: a box moved with held arrow keys (Track A exit criterion).
 *
 * Manual run (real TTY):  bun tests/fixtures/held-key-spike.ts
 *   Hold the right arrow — the box glides while the key is held and stops
 *   when the repeat stream expires. Press q or Ctrl+C to quit.
 *
 * Subprocess run (tests/input.test.ts): stdin is a pipe, so loop() never
 * attaches its raw-mode stdin listener — the fixture wires stdin to
 * applyInputToState itself and reports movement via stderr JSON on exit.
 */

import { createScreenContext } from '../../src/dsl';
import { applyInputToState, loop } from '../../src/render';
import { clearBackBuffer, createScreenState } from '../../src/state';

const state = createScreenState({ fps: 120, keyboard: true });

let x = 2;
let moves = 0;
let sawHold = false;
let sawRelease = false;
const startedAt = Date.now();

// In a real TTY, loop() attaches its own raw-mode stdin listener; only wire
// stdin manually when it's a pipe (subprocess test mode).
if (!process.stdin.isTTY) {
  process.stdin.on('data', (data) => {
    applyInputToState(state, data, () => state.requestStop?.());
  });
  process.stdin.resume();
}

await loop(state, (s) => {
  clearBackBuffer(s);
  const ctx = createScreenContext(s);

  if (ctx.lastKey === 'q') {
    ctx.requestStop();
    return;
  }

  // Platformer-style movement: velocity while the key is held, not a
  // one-step-per-keypress hop.
  if (ctx.isKeyHeld('right')) {
    sawHold = true;
    x = Math.min(x + 1, s.width - 6);
    moves++;
  }
  if (ctx.isKeyHeld('left')) {
    sawHold = true;
    x = Math.max(x - 1, 0);
    moves++;
  }
  if (ctx.keys.some((e) => e.key === 'right' && e.kind === 'release')) {
    sawRelease = true;
  }

  ctx.rect(x, 2, 5, 3, { char: '█', fg: 'cyan' });
  ctx.flushFlow();

  // Subprocess mode: exit once we've observed a full hold+release cycle
  // (or bail after 10s so a broken run still reports).
  if (!process.stdin.isTTY) {
    if ((sawHold && sawRelease) || Date.now() - startedAt > 10_000) {
      ctx.requestStop();
    }
  }
});

if (!process.stdin.isTTY) {
  process.stderr.write(JSON.stringify({ x, moves, sawHold, sawRelease }));
}
