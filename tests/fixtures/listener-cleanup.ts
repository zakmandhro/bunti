/**
 * Fixture: runs render() to completion twice and reports process listener
 * counts (baseline / during a loop / after both loops) as JSON on stderr.
 * Expected: counts during the loop are baseline + 1, and return to the
 * exact baseline after — no listener accumulation across render cycles.
 */

import { render } from '../../src/index';

const EVENTS = [
  'uncaughtException',
  'unhandledRejection',
  'exit',
  'SIGHUP',
  'SIGINT',
  'SIGTERM',
  'SIGWINCH',
] as const;

const counts = () =>
  Object.fromEntries(EVENTS.map((e) => [e, process.listenerCount(e)]));

const baseline = counts();
let during: Record<string, number> | undefined;

for (let i = 0; i < 2; i++) {
  let frame = 0;
  await render(
    (b) => {
      during ??= counts();
      frame += 1;
      if (frame >= 2) b.requestStop();
    },
    { fps: 240 },
  );
}

console.error(JSON.stringify({ baseline, during, after: counts() }));
