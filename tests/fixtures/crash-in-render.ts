/**
 * Fixture: throws inside the render callback on the second frame.
 * Expected: terminal restored (stdout ends with restore sequence),
 * error reported exactly once on stderr, exit code 1.
 */

import { render } from '../../src/index';

// Joined at runtime so the message never appears verbatim in Bun's
// source-line excerpt — lets the test assert it appears exactly once.
const MESSAGE = ['render-crash', 'marker'].join('-');

let frame = 0;
await render(
  (b) => {
    b.blit(0, 0, 'FRAME');
    frame += 1;
    if (frame >= 2) {
      throw new Error(MESSAGE);
    }
  },
  { alternateBuffer: true, hideCursor: true, fps: 240 },
);

console.log('UNREACHABLE');
