/**
 * Bunti Functional Rendering & Diffing
 */

import {
  createKeyEvent,
  HeldKeyTracker,
  type InputToken,
  InputTokenizer,
  type KeyEvent,
} from './input';
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
  const sync = state.syncOutput !== false;
  process.stdout.write(
    (sync ? ANSI.syncStart : '') +
      ANSI.clear +
      ANSI.home +
      (sync ? ANSI.syncEnd : ''),
  );
  state.needsFullRedraw = true;
}

/** Copies a back-buffer cell's fields onto its front-buffer counterpart. */
function syncFrontCell(
  front: NonNullable<ScreenState['frontBuffer'][number]>,
  cell: NonNullable<ScreenState['backBuffer'][number]>,
) {
  front.char = cell.char;
  front.fg = cell.fg;
  front.bg = cell.bg;
  front.fgCode = cell.fgCode;
  front.bgCode = cell.bgCode;
  front.bold = cell.bold;
  front.italic = cell.italic;
  front.underline = cell.underline;
  front.dim = cell.dim;
  front.strike = cell.strike;
  front.skip = cell.skip;
}

/**
 * Diffs back and front buffers and assembles the ANSI update string.
 * Mutates the front buffer and the state's SGR trackers exactly like a real
 * flush, but performs no I/O — flush() writes the result, tests assert on it.
 */
export function renderFrame(state: ScreenState): string {
  let renderString = state.needsFullRedraw ? ANSI.clear + ANSI.home : '';
  let lastFg: any = state.lastFg;
  let lastBg: any = state.lastBg;
  let lastBold: boolean = state.lastBold ?? false;
  let lastItalic: boolean = state.lastItalic ?? false;
  let lastUnderline: boolean = state.lastUnderline ?? false;
  let lastDim: boolean = state.lastDim ?? false;
  let lastStrike: boolean = state.lastStrike ?? false;

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
        !!b!.italic !== !!f!.italic ||
        !!b!.underline !== !!f!.underline ||
        !!b!.dim !== !!f!.dim ||
        !!b!.strike !== !!f!.strike ||
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

        if (cell!.skip || cell!.char === '') {
          syncFrontCell(front!, cell!);
          continue;
        }

        const fg = cell!.fgCode;
        const bg = cell!.bgCode;
        const bold = !!cell!.bold;
        const dim = !!cell!.dim;
        const italic = !!cell!.italic;
        const underline = !!cell!.underline;
        const strike = !!cell!.strike;

        if (bold !== lastBold || dim !== lastDim) {
          // SGR 22 clears BOTH bold and dim, so they are emitted jointly:
          // if either must turn off, emit 22 and re-assert the survivor.
          if ((lastBold && !bold) || (lastDim && !dim)) {
            renderString += '\x1b[22m';
            if (bold) renderString += '\x1b[1m';
            if (dim) renderString += '\x1b[2m';
          } else {
            if (bold && !lastBold) renderString += '\x1b[1m';
            if (dim && !lastDim) renderString += '\x1b[2m';
          }
          lastBold = bold;
          lastDim = dim;
        }

        if (italic !== lastItalic) {
          renderString += italic ? '\x1b[3m' : '\x1b[23m';
          lastItalic = italic;
        }

        if (underline !== lastUnderline) {
          renderString += underline ? '\x1b[4m' : '\x1b[24m';
          lastUnderline = underline;
        }

        if (strike !== lastStrike) {
          renderString += strike ? '\x1b[9m' : '\x1b[29m';
          lastStrike = strike;
        }

        if (fg !== lastFg || bg !== lastBg) {
          if (fg === undefined && bg === undefined) {
            renderString += '\x1b[0m';
            // SGR 0 wipes every attribute; re-assert the active ones.
            if (lastBold) renderString += '\x1b[1m';
            if (lastDim) renderString += '\x1b[2m';
            if (lastItalic) renderString += '\x1b[3m';
            if (lastUnderline) renderString += '\x1b[4m';
            if (lastStrike) renderString += '\x1b[9m';
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
        syncFrontCell(front!, cell!);
      }
    }
  }

  state.needsFullRedraw = false;
  state.lastFg = lastFg;
  state.lastBg = lastBg;
  state.lastBold = lastBold;
  state.lastItalic = lastItalic;
  state.lastUnderline = lastUnderline;
  state.lastDim = lastDim;
  state.lastStrike = lastStrike;

  return renderString;
}

/**
 * Diffs back and front buffers surgically and writes the update to stdout.
 */
export function flush(state: ScreenState) {
  const renderString = renderFrame(state);

  if (renderString) {
    const writer = Bun.stdout.writer();
    // Synchronized-output wrap (mode 2026) is gated on the detected profile:
    // emitted unless the terminal was positively identified as lacking it
    // (state.syncOutput === false). Absent/unknown profiles keep the wrap.
    const sync = state.syncOutput !== false;
    writer.write(
      (sync ? ANSI.syncStart : '') +
        (state.options.hideCursor ? ANSI.hideCursor : '') +
        renderString +
        (sync ? ANSI.syncEnd : ''),
    );
    writer.flush();
  }
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
      state.inputTokenizer?.dispose();
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
          drainFrameInput(state);
          // Frame timing: loop() owns the clock. dt is clamped so a
          // suspended process doesn't produce a giant catch-up step.
          const now = Date.now();
          state.dt =
            state.lastFrameAt === undefined
              ? 0
              : Math.min(100, now - state.lastFrameAt);
          state.lastFrameAt = now;
          state.frameCount = (state.frameCount ?? 0) + 1;
          renderCallback(state);
          if (stopped || state.isStopped) return;
          flush(state);
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

function requestTick(state: ScreenState) {
  (state as { requestTick?: () => void }).requestTick?.();
}

function heldTracker(state: ScreenState): HeldKeyTracker {
  state.heldKeys ??= new HeldKeyTracker({
    holdWindowMs: state.options.holdWindowMs,
  });
  return state.heldKeys;
}

/**
 * Classifies a key event (press vs repeat), enqueues it, and mirrors the
 * legacy `state.lastKey` slot. Ctrl+C keeps its stop/SIGINT behavior and
 * never enters the queue.
 */
function enqueueKeyEvent(
  state: ScreenState,
  event: KeyEvent,
  stop?: () => void,
) {
  if (event.ctrl && event.key === 'c') {
    stop?.(); // Ctrl+C
    return;
  }
  const classified = heldTracker(state).record(event);
  state.keyQueue.push(classified);
  // Back-compat: lastKey only ever carries unmodified key names, so ctrl
  // bytes no longer leak into text consumers like Input.
  if (!classified.ctrl && !classified.alt && classified.kind !== 'release') {
    state.lastKey = classified.key;
  }
}

/**
 * SGR mouse semantics:
 * - wheel (bit 64): wheel_up / wheel_down key events, no press state
 * - motion (bit 32): coordinates only (drags keep the pressed button)
 * - press 'M': records the press origin; no click yet
 * - release 'm': emits 'click' ONCE at the press-origin coordinates
 */
function dispatchMouse(
  state: ScreenState,
  token: Extract<InputToken, { type: 'mouse' }>,
  stop?: () => void,
) {
  const button = token.button;
  state.mouseX = token.x - 1;
  state.mouseY = token.y - 1;

  if (button & 64) {
    // Wheel
    state.mouseButton = button;
    if (token.action === 'press') {
      if (button === 64) {
        enqueueKeyEvent(state, createKeyEvent('wheel_up', token.raw), stop);
      } else if (button === 65) {
        enqueueKeyEvent(state, createKeyEvent('wheel_down', token.raw), stop);
      }
    }
  } else if (button & 32) {
    // Motion. Base 3 = no buttons held (pure move): keep press state as-is.
    const base = button & 3;
    if (base !== 3) state.mouseButton = base;
  } else if (token.action === 'press') {
    state.mouseButton = button;
    state.isMouseDown = true;
    if ((button & 3) === 0) {
      state.mouseDownX = state.mouseX;
      state.mouseDownY = state.mouseY;
    }
  } else {
    state.mouseButton = button;
    state.isMouseDown = false;
    if (
      (button & 3) === 0 &&
      state.mouseDownX !== undefined &&
      state.mouseDownY !== undefined
    ) {
      state.clickX = state.mouseDownX;
      state.clickY = state.mouseDownY;
      enqueueKeyEvent(state, createKeyEvent('click', token.raw), stop);
    }
    state.mouseDownX = undefined;
    state.mouseDownY = undefined;
  }
}

function dispatchInputTokens(
  state: ScreenState,
  tokens: InputToken[],
  stop?: () => void,
) {
  for (const token of tokens) {
    switch (token.type) {
      case 'focus': {
        state.hasFocus = token.focused;
        (state as { restartLoop?: () => void }).restartLoop?.();
        continue; // restartLoop already forces a tick
      }
      case 'response': {
        state.terminalResponses.push(token.response);
        // Bounded: consumers drain; a probe-less app must not leak.
        if (state.terminalResponses.length > 64) {
          state.terminalResponses.shift();
        }
        break;
      }
      case 'mouse': {
        dispatchMouse(state, token, stop);
        break;
      }
      case 'key': {
        enqueueKeyEvent(state, token.event, stop);
        break;
      }
    }
    requestTick(state);
  }
}

/**
 * Feeds a raw stdin chunk through the screen's stateful tokenizer and
 * dispatches the resulting tokens. Partial escape sequences are carried
 * across calls; a bare ESC flushes as 'escape' via the tokenizer timer.
 */
export function applyInputToState(
  state: ScreenState,
  data: unknown,
  stop?: () => void,
) {
  const input = data instanceof Buffer ? data.toString() : String(data);
  state.inputTokenizer ??= new InputTokenizer({
    escTimeoutMs: state.options.escTimeoutMs,
  });
  const tokenizer = state.inputTokenizer;
  // Rebind each call so timer flushes see the latest stop handler.
  tokenizer.onFlush = (tokens) => dispatchInputTokens(state, tokens, stop);
  dispatchInputTokens(state, tokenizer.push(input), stop);
}

/**
 * Moves queued KeyEvents into this frame's `state.keys`, appends synthetic
 * held-key releases, and recomputes the legacy `state.lastKey` slot (first
 * unmodified press/repeat of the frame). Runs once per render tick, before
 * the render callback.
 */
export function drainFrameInput(state: ScreenState) {
  const frame = state.keyQueue.length > 0 ? state.keyQueue.splice(0) : [];
  if (state.heldKeys) {
    const releases = state.heldKeys.collectReleases();
    if (releases.length > 0) frame.push(...releases);
  }
  state.keys = frame;

  let lastKey: string | undefined;
  let hasClick = false;
  for (const event of frame) {
    if (event.kind === 'release') continue;
    if (event.key === 'click') hasClick = true;
    if (lastKey === undefined && !event.ctrl && !event.alt) {
      lastKey = event.key;
    }
  }
  state.lastKey = lastKey;
  if (!hasClick) {
    state.clickX = undefined;
    state.clickY = undefined;
  }
}
