/**
 * Fixture: once-mode render. Expected: the library never calls
 * process.exit, so code after `await render(...)` runs and the process
 * exits 0 naturally (nothing keeps the event loop alive).
 */

import { render } from '../../src/index';

await render((b) => b.blit(0, 0, 'ONCE-FRAME'), { once: true });

console.log('AFTER_RENDER');
