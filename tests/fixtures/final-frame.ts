/**
 * Fixture: the very first frame paints content and immediately requests
 * stop. Expected: the final frame is flushed BEFORE teardown, so stdout
 * contains the frame text followed by the restore sequence, exit 0.
 */

import { render } from '../../src/index';

await render(
  (b) => {
    b.text('FINAL-FRAME-MARKER');
    b.blit(0, 1, 'FINAL-BLIT-MARKER');
    b.requestStop();
  },
  { alternateBuffer: true, hideCursor: true, fps: 240 },
);

console.log('FINAL_EXIT');
