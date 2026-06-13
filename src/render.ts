/**
 * Bunti Functional Rendering & Diffing
 */

import { ANSI, type ScreenState } from './state';

/**
 * Diffs back and front buffers surgically.
 */
export function flush(state: ScreenState) {
  const writer = Bun.stdout.writer();
  let renderString = '';
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
        !!b!.bold !== !!f!.bold
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

        if (cell!.char === '') {
          front!.char = '';
          front!.fg = cell!.fg;
          front!.bg = cell!.bg;
          front!.fgCode = cell!.fgCode;
          front!.bgCode = cell!.bgCode;
          front!.bold = cell!.bold;
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
      }
    }
  }

  if (renderString) {
    writer.write(
      ANSI.syncStart + ANSI.hideCursor + renderString + ANSI.syncEnd,
    );
    writer.flush();
  }

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
  const options = state.options;

  if (options.alternateBuffer) process.stdout.write(ANSI.alternateBuffer);
  if (options.hideCursor) process.stdout.write(ANSI.hideCursor);

  return new Promise((resolve) => {
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

    const stop = () => {
      if (stopped) return;
      stopped = true;

      if (interval) clearInterval(interval);

      // 1. Restore Terminal Modes
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      }

      // 2. Remove Listeners
      process.stdin.removeListener('data', inputHandler);
      process.removeListener('SIGWINCH', resizeHandler);
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);

      // 3. Emit Restorative ANSI Sequence
      let cmd = '';
      if (options.mouse) cmd += ANSI.mouseDisable;
      if (options.focus) cmd += ANSI.focusDisable;
      if (options.alternateBuffer) cmd += ANSI.mainBuffer;
      if (options.hideCursor) cmd += ANSI.showCursor;
      cmd += ANSI.reset;

      process.stdout.write(cmd);
      resolve();
    };

    const resizeHandler = () => {
      resizeScreen(state);
      tick();
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
          renderCallback(state);
          flush(state);
          state.lastKey = undefined;
        } while (tickAgain);
      } catch (err) {
        console.error(err);
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

import { resizeScreen } from './state';
