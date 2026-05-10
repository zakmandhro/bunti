/**
 * Bunti Functional Rendering & Diffing
 */

import { ScreenState, ANSI } from './state';
import { resolveColor } from './colors';
import { charWidth } from './utils';

/**
 * Diffs back and front buffers surgically.
 */
export function flush(state: ScreenState) {
  const writer = Bun.stdout.writer();
  let renderString = '';
  let lastFg: any = state.lastFg;
  let lastBg: any = state.lastBg;

  for (let y = 0; y < state.height; y++) {
    let firstDirty = -1;
    let lastDirty = -1;

    for (let x = 0; x < state.width; x++) {
      const b = state.backBuffer[y][x];
      const f = state.frontBuffer[y][x];
      if (b.char !== f.char || b.fg !== f.fg || b.bg !== f.bg) {
        if (firstDirty === -1) firstDirty = x;
        lastDirty = x;
      }
    }

    if (firstDirty !== -1) {
      renderString += `\x1b[${y + 1};${firstDirty + 1}H`;
      
      for (let x = firstDirty; x <= lastDirty; x++) {
        const cell = state.backBuffer[y][x];
        const front = state.frontBuffer[y][x];

        if (cell.char === '') {
          front.char = ''; front.fg = cell.fg; front.bg = cell.bg;
          continue;
        }

        const fg = cell.fg !== undefined ? resolveColor(cell.fg) : undefined;
        const bg = cell.bg !== undefined ? resolveColor(cell.bg) : undefined;

        if (fg !== lastFg || bg !== lastBg) {
          if (fg === undefined && bg === undefined) {
            renderString += '\x1b[0m';
          } else {
            // Foreground
            if (fg !== lastFg) {
              if (fg === undefined) renderString += '\x1b[39m';
              else renderString += (typeof fg === 'string' && fg.startsWith('2;')) ? `\x1b[38;${fg}m` : `\x1b[38;5;${fg}m`;
            }
            // Background - FIXED: Using 48 for Background TrueColor
            if (bg !== lastBg) {
              if (bg === undefined) renderString += '\x1b[49m';
              else renderString += (typeof bg === 'string' && bg.startsWith('2;')) ? `\x1b[48;${bg}m` : `\x1b[48;5;${bg}m`;
            }
          }
          lastFg = fg;
          lastBg = bg;
        }

        renderString += cell.char;
        front.char = cell.char; front.fg = cell.fg; front.bg = cell.bg;
      }
    }
  }

  if (renderString) {
    writer.write(renderString);
    writer.flush();
  }

  state.lastFg = lastFg;
  state.lastBg = lastBg;
}

/**
 * Starts the render loop for a given screen state.
 */
export function loop(state: ScreenState, renderCallback: (s: ScreenState) => void) {
  const options = state.options;

  if (options.alternateBuffer) process.stdout.write(ANSI.alternateBuffer);
  if (options.hideCursor) process.stdout.write(ANSI.hideCursor);
  
  const setupInput = () => {
    let cmd = '';
    if (options.mouse) cmd += ANSI.mouseEnable;
    if (options.focus) cmd += ANSI.focusEnable;
    if (cmd) process.stdout.write(cmd);
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => handleInput(state, data, stop));
  };

  const stop = () => {
    if (interval) clearInterval(interval);
    let cmd = '';
    if (options.mouse) cmd += ANSI.mouseDisable;
    if (options.focus) cmd += ANSI.focusDisable;
    if (options.alternateBuffer) cmd += ANSI.mainBuffer;
    if (options.hideCursor) cmd += ANSI.showCursor;
    cmd += ANSI.reset;
    process.stdout.write(cmd);
    process.exit(0);
  };

  if (options.mouse || options.focus || options.keyboard) setupInput();

  process.on('SIGWINCH', () => {
    resizeScreen(state);
    process.stdout.write(ANSI.clear);
    tick();
  });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  let interval: any = null;
  const tick = () => {
    renderCallback(state);
    flush(state);
    state.lastKey = undefined;
  };

  const restartLoop = () => {
    if (interval) clearInterval(interval);
    const fps = state.hasFocus ? (options.fps || 60) : 5;
    interval = setInterval(tick, 1000 / fps);
    tick();
  };

  (state as any).restartLoop = restartLoop; 
  restartLoop();
}

function handleInput(state: ScreenState, data: any, stop: () => void) {
  const input = data.toString();

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

  const match = input.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
  if (match) {
    state.mouseButton = parseInt(match[1]);
    state.mouseX = parseInt(match[2]) - 1;
    state.mouseY = parseInt(match[3]) - 1;
    state.isMouseDown = match[4] === 'M';
    return;
  }

  if (input === '\u0003') stop();
  state.lastKey = input;
}

import { resizeScreen } from './state';
