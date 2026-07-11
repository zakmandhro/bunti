/**
 * Fixture: options.onError returning 'continue' keeps the loop alive after
 * a render-callback throw (app-level error boundary). Expected: exit 0.
 */

import { render } from '../../src/index';

let frame = 0;
let caught = 0;

await render(
  (b) => {
    frame += 1;
    if (frame === 2) throw new Error('recoverable-frame-error');
    if (frame >= 4) b.requestStop();
  },
  {
    fps: 240,
    onError: () => {
      caught += 1;
      return 'continue';
    },
  },
);

console.log(`SURVIVED:${caught}`);
