/**
 * Bunti DSL primary entry point: render.
 */

import { init } from '../icons';
import { flush, loop } from '../render';
import {
  clearBackBuffer,
  createScreenState,
  type ScreenOptions,
} from '../state';
import { createScreenContext } from './context';
import type { BuntiContext } from './types';

/**
 * Primary Entry Point
 */
export async function render(
  callback: ((b: BuntiContext) => void) | string,
  options: ScreenOptions & { once?: boolean } = {},
) {
  if (typeof Bun === 'undefined') {
    throw new Error(
      'Bunti is Bun-native and uses Bun runtime APIs. ' +
        'Run with Bun >=1.0: https://bun.sh — Node.js is not supported.',
    );
  }

  // Sync apply forced options first
  if (options.nerdFont !== undefined) {
    await init({ nerdFont: options.nerdFont });
  } else {
    // Start detection in background, don't await!
    init();
  }

  const state = createScreenState(options);

  const tick = () => {
    clearBackBuffer(state);
    const b = createScreenContext(state);
    if (typeof callback === 'string') {
      b.blit(0, 0, callback);
    } else {
      callback(b);
    }
    if (state.isStopped) return;
    b.flushFlow();
    if (state.isStopped) return;
    flush(state);
  };

  if (options.once) {
    tick();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
        process.exit(0);
      }, 50);
    });
    return;
  }

  await loop(state, (_s) => tick());
}
