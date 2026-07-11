/**
 * Bunti DSL primary entry point: render.
 */

import { init } from '../icons';
import { flush, loop } from '../render';
import {
  ANSI,
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

  // createScreenState runs env detection once per render() (state.terminal).
  const state = createScreenState(options);

  // Icon tier: an explicit ScreenOptions.nerdFont always wins; otherwise the
  // detected profile decides ('yes'/'assumed-yes' -> Nerd Font glyphs).
  if (options.nerdFont !== undefined) {
    await init({ nerdFont: options.nerdFont });
  } else {
    await init({ profile: state.terminal });
  }

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
    // Let the terminal settle for a frame, then resolve. No interval or
    // stdin listener was started in once mode, so nothing keeps the event
    // loop alive and the host process (never killed by the library) can
    // continue or exit naturally.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    // flush() hides the cursor per-frame when requested; a once-shot must
    // not leave the user's cursor invisible.
    if (options.hideCursor) process.stdout.write(ANSI.showCursor);
    return;
  }

  await loop(state, (_s) => tick());
}
