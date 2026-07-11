/**
 * Fixture: throws asynchronously (setTimeout) outside the render tick while
 * the loop is running. Expected: uncaughtException handler restores the
 * terminal first, prints the error once to stderr, exits 1.
 */

import { render } from '../../src/index';

const MESSAGE = ['async-crash', 'marker'].join('-');

setTimeout(() => {
  throw new Error(MESSAGE);
}, 80);

await render((b) => b.blit(0, 0, 'FRAME'), {
  alternateBuffer: true,
  hideCursor: true,
});

console.log('UNREACHABLE');
