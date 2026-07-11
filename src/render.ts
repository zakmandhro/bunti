/**
 * Bunti Functional Rendering & Diffing
 */

import { ANSI, resizeScreen, type ScreenState } from './state';

/**
 * Crash safety: every screen with an active render loop is tracked here so
 * that process-level failure handlers can restore the terminal no matter how
 * the process goes down (throw, unhandled rejection, exit, SIGHUP).
 */
const activeScreens = new Set<ScreenState>();

/**
 * Emits the restorative ANSI sequence for a screen (mouse/focus tracking off,
 * reset, clear, back to main buffer, cursor visible) and disables raw mode.
 * Idempotent: safe to call any number of times per loop session.
 */
export function restoreTerminal(state: ScreenState) {
  if (state.isRestored) return;
  state.isRestored = true;

  const options = state.options;
  let cmd = '';
  if (options.mouse) cmd += ANSI.mouseDisable;
  if (options.focus) cmd += ANSI.focusDisable;
  cmd += ANSI.reset + ANSI.clear + ANSI.home;
  if (options.alternateBuffer) cmd += ANSI.mainBuffer;
  cmd += ANSI.showCursor;
  cmd += ANSI.reset;

  try {
    process.stdout.write(cmd);
  } catch {
    // stdout may already be gone (e.g. terminal closed on SIGHUP)
  }

  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    } catch {
      // stdin may already be destroyed
    }
  }
}

function restoreAllScreens() {
  for (const screen of activeScreens) restoreTerminal(screen);
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  return String(err);
}

/** Restore first, then report on the main screen, then die like the runtime would. */
const onUncaughtException = (err: unknown) => {
  restoreAllScreens();
  process.stderr.write(`${formatError(err)}\n`);
  process.exit(1);
};

const onUnhandledRejection = (reason: unknown) => {
  restoreAllScreens();
  process.stderr.write(`${formatError(reason)}\n`);
  process.exit(1);
};

/** 'exit' must stay synchronous: restore only, never exit() or async work. */
const onProcessExit = () => {
  restoreAllScreens();
};

const onSighup = () => {
  restoreAllScreens();
  process.exit(129); // 128 + SIGHUP(1), matching default signal death
};

let crashHandlersInstalled = false;

function installCrashHandlers() {
  if (crashHandlersInstalled) return;
  crashHandlersInstalled = true;
  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);
  process.on('exit', onProcessExit);
  process.on('SIGHUP', onSighup);
}

function removeCrashHandlers() {
  if (!crashHandlersInstalled) return;
  crashHandlersInstalled = false;
  process.removeListener('uncaughtException', onUncaughtException);
  process.removeListener('unhandledRejection', onUnhandledRejection);
  process.removeListener('exit', onProcessExit);
  process.removeListener('SIGHUP', onSighup);
}

export function syncScreenSize(state: ScreenState) {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  if (state.width !== width || state.height !== height) {
    resizeScreen(state);
    return true;
  }
  return false;
}

export function isResizeSettled(state: ScreenState, now = Date.now()) {
  return !state.isResizing || now >= (state.resizeSettlesAt ?? 0);
}

export function clearTerminalForResize(state: ScreenState) {
  process.stdout.write(ANSI.syncStart + ANSI.clear + ANSI.home + ANSI.syncEnd);
  state.needsFullRedraw = true;
}

/**
 * Diffs back and front buffers surgically.
 */
export function flush(state: ScreenState) {
  const writer = Bun.stdout.writer();
  let renderString = state.needsFullRedraw ? ANSI.clear + ANSI.home : '';
  let lastFg: any = state.lastFg;
  let lastBg: any = state.lastBg;
  let lastBold: boolean = state.lastBold ?? false;

  const width = state.width;
  const height = state.height;

  for (let y = 0; y < height; y++) {
    let firstDirty = -1;
    let lastDirty = -1;
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const b = state.backBuffer[idx];
      const f = state.frontBuffer[idx];
      if (
        b!.char !== f!.char ||
        b!.fg !== f!.fg ||
        b!.bg !== f!.bg ||
        !!b!.bold !== !!f!.bold ||
        !!b!.skip !== !!f!.skip
      ) {
        if (firstDirty === -1) firstDirty = x;
        lastDirty = x;
      }
    }

    if (firstDirty !== -1) {
      renderString += `\x1b[${y + 1};${firstDirty + 1}H`;

      for (let x = firstDirty; x <= lastDirty; x++) {
        const idx = rowOffset + x;
        const cell = state.backBuffer[idx];
        const front = state.frontBuffer[idx];

        if (cell!.skip) {
          front!.char = cell!.char;
          front!.fg = cell!.fg;
          front!.bg = cell!.bg;
          front!.fgCode = cell!.fgCode;
          front!.bgCode = cell!.bgCode;
          front!.bold = cell!.bold;
          front!.skip = cell!.skip;
          continue;
        }

        if (cell!.char === '') {
          front!.char = '';
          front!.fg = cell!.fg;
          front!.bg = cell!.bg;
          front!.fgCode = cell!.fgCode;
          front!.bgCode = cell!.bgCode;
          front!.bold = cell!.bold;
          front!.skip = cell!.skip;
          continue;
        }

        const fg = cell!.fgCode;
        const bg = cell!.bgCode;
        const bold = !!cell!.bold;

        if (bold !== lastBold) {
          renderString += bold ? '\x1b[1m' : '\x1b[22m';
          lastBold = bold;
        }

        if (fg !== lastFg || bg !== lastBg) {
          if (fg === undefined && bg === undefined) {
            renderString += '\x1b[0m';
            if (lastBold) {
              renderString += '\x1b[1m';
            }
          } else {
            // Foreground
            if (fg !== lastFg) {
              if (fg === undefined) {
                renderString += '\x1b[39m';
              } else {
                const fgStr = String(fg);
                if (fgStr.startsWith('2;')) {
                  renderString += `\x1b[38;${fgStr}m`;
                } else {
                  renderString += `\x1b[38;5;${fgStr}m`;
                }
              }
            }
            // Background
            if (bg !== lastBg) {
              if (bg === undefined) {
                renderString += '\x1b[49m';
              } else {
                const bgStr = String(bg);
                if (bgStr.startsWith('2;')) {
                  renderString += `\x1b[48;${bgStr}m`;
                } else {
                  renderString += `\x1b[48;5;${bgStr}m`;
                }
              }
            }
          }
          lastFg = fg;
          lastBg = bg;
        }

        renderString += cell!.char;
        front!.char = cell!.char;
        front!.fg = cell!.fg;
        front!.bg = cell!.bg;
        front!.fgCode = cell!.fgCode;
        front!.bgCode = cell!.bgCode;
        front!.bold = cell!.bold;
        front!.skip = cell!.skip;
      }
    }
  }

  if (renderString) {
    writer.write(
      ANSI.syncStart +
        (state.options.hideCursor ? ANSI.hideCursor : '') +
        renderString +
        ANSI.syncEnd,
    );
    writer.flush();
  }

  state.needsFullRedraw = false;
  state.lastFg = lastFg;
  state.lastBg = lastBg;
  state.lastBold = lastBold;
}

/**
 * Starts the render loop for a given screen state.
 */
export function loop(
  state: ScreenState,
  renderCallback: (s: ScreenState) => void,
): Promise<void> {
  if (activeScreens.size > 0) {
    throw new Error(
      'A Bunti render loop is already active in this process. ' +
        'Stop it first (requestStop or Ctrl+C) before calling render() again.',
    );
  }

  const options = state.options;

  state.isRestored = false;
  activeScreens.add(state);
  installCrashHandlers();

  if (options.alternateBuffer) process.stdout.write(ANSI.alternateBuffer);
  if (options.hideCursor) process.stdout.write(ANSI.hideCursor);

  return new Promise((resolve, reject) => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const setupInput = () => {
      let cmd = '';
      if (options.mouse) cmd += ANSI.mouseEnable;
      if (options.focus) cmd += ANSI.focusEnable;
      if (cmd) process.stdout.write(cmd);

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', inputHandler);
      }
    };

    const inputHandler = (data: unknown) =>
      applyInputToState(state, data, stop);

    /**
     * Tears the loop down exactly once: clears the interval, removes every
     * listener this loop registered, restores the terminal, then settles the
     * promise (rejecting with `failure.error` when a frame crashed).
     */
    const finish = (failure: { error: unknown } | null) => {
      if (stopped) return;
      stopped = true;
      state.isStopped = true;

      if (interval) clearInterval(interval);

      // 1. Remove Listeners
      process.stdin.removeListener('data', inputHandler);
      process.removeListener('SIGWINCH', resizeHandler);
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      activeScreens.delete(state);
      if (activeScreens.size === 0) removeCrashHandlers();

      // 2. Restore Terminal Modes + Emit Restorative ANSI Sequence
      restoreTerminal(state);

      if (failure) {
        reject(failure.error);
      } else {
        resolve();
      }
    };

    const stop = () => finish(null);

    const resizeHandler = () => {
      resizeScreen(state);
      clearTerminalForResize(state);
      requestTick();
    };

    let ticking = false;
    let tickAgain = false;

    const tick = () => {
      if (ticking) {
        tickAgain = true;
        return;
      }

      ticking = true;
      try {
        do {
          tickAgain = false;
          const resized = syncScreenSize(state);
          if (resized) {
            clearTerminalForResize(state);
          }
          if (!isResizeSettled(state)) {
            continue;
          }
          state.isResizing = false;
          if (stopped || state.isStopped) return;
          renderCallback(state);
          if (stopped || state.isStopped) return;
          flush(state);
          state.lastKey = undefined;
        } while (tickAgain);
      } catch (err) {
        // Never write errors into the alt screen and never keep looping over
        // a broken frame. Either the app opts into continuing via onError,
        // or we tear down (restoring the terminal) and reject the loop
        // promise so the error surfaces once, on the main screen.
        let shouldContinue = false;
        if (options.onError) {
          try {
            shouldContinue = options.onError(err) === 'continue';
          } catch {
            shouldContinue = false; // a broken error handler never saves the loop
          }
        }
        if (!shouldContinue) {
          finish({ error: err });
        }
      } finally {
        ticking = false;
      }
    };

    const requestTick = () => {
      if (ticking) {
        tickAgain = true;
      } else {
        tick();
      }
    };

    const restartLoop = () => {
      if (interval) clearInterval(interval);
      const fps = state.hasFocus ? options.fps || 60 : 5;
      interval = setInterval(tick, 1000 / fps);
      requestTick();
    };

    if (options.mouse || options.focus || options.keyboard) setupInput();

    process.on('SIGWINCH', resizeHandler);
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    (state as { restartLoop?: () => void }).restartLoop = restartLoop;
    (state as { requestTick?: () => void }).requestTick = requestTick;
    (state as { requestStop?: () => void }).requestStop = stop;
    restartLoop();
  });
}

export function applyInputToState(
  state: ScreenState,
  data: unknown,
  stop?: () => void,
) {
  const input = data instanceof Buffer ? data.toString() : String(data);

  // 1. Focus Tracking
  if (input === '\x1b[I') {
    state.hasFocus = true;
    if ((state as any).restartLoop) (state as any).restartLoop();
    return;
  }
  if (input === '\x1b[O') {
    state.hasFocus = false;
    if ((state as any).restartLoop) (state as any).restartLoop();
    return;
  }

  // 2. Mouse Tracking (SGR protocol)
  const match = input.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
  if (match) {
    state.mouseButton = parseInt(match[1], 10);
    state.mouseX = parseInt(match[2], 10) - 1;
    state.mouseY = parseInt(match[3], 10) - 1;
    state.isMouseDown = match[4] === 'M';
    if ((state as { requestTick?: () => void }).requestTick) {
      (state as { requestTick?: () => void }).requestTick!();
    }
    if (match[4] === 'M') {
      if (state.mouseButton === 64) state.lastKey = 'wheel_up';
      else if (state.mouseButton === 65) state.lastKey = 'wheel_down';
      else if (state.mouseButton === 0) state.lastKey = 'click';
    }
    return;
  }

  // 3. Signal Interception
  if (input === '\u0003') {
    stop?.(); // Ctrl+C
    return;
  }

  // 4. Key Normalization
  let key = input;
  if (input === '\x7f' || input === '\x08') key = 'backspace';
  else if (input === '\r' || input === '\n') key = 'enter';
  else if (input === '\t') key = 'tab';
  else if (input === '\x1b[A') key = 'up';
  else if (input === '\x1b[B') key = 'down';
  else if (input === '\x1b[C') key = 'right';
  else if (input === '\x1b[D') key = 'left';
  else if (input === '\x1b') key = 'escape';

  state.lastKey = key;
  if ((state as { requestTick?: () => void }).requestTick) {
    (state as { requestTick?: () => void }).requestTick!();
  }
}
