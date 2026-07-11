/**
 * Fixture: starting a second render() while one is active must throw the
 * double-start guard error; the first loop keeps working and can be
 * stopped cleanly afterwards.
 */

import { render } from '../../src/index';

let stop: (() => void) | undefined;

const first = render((b) => {
  b.blit(0, 0, 'ONE');
  stop = () => b.requestStop();
});

await new Promise((resolve) => setTimeout(resolve, 50));

try {
  await render(() => {});
  console.error('NO_GUARD');
} catch (err) {
  console.error(`GUARD:${(err as Error).message}`);
}

stop?.();
await first;

console.log('DONE');
