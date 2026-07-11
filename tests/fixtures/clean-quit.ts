/**
 * Fixture: clean shutdown via requestStop. Expected: restore sequence on
 * stdout, then code after `await render(...)` runs, exit 0.
 */

import { render } from '../../src/index';

let frame = 0;
await render(
  (b) => {
    b.blit(0, 0, 'QUIT-DEMO');
    frame += 1;
    if (frame >= 3) b.requestStop();
  },
  { alternateBuffer: true, hideCursor: true, fps: 240 },
);

console.log('CLEAN_EXIT');
