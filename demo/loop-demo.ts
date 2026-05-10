import { render, box as layoutBox, joinVertical } from '../src/index';

/**
 * Bunti Render Loop & Screen Buffer Demo
 */

let frame = 0;

render(({ state, box, color, width, height }) => {
  // 1. Draw Animated Background directly to buffer
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorVal = 232 + (Math.floor((x + y + frame) / 5) % 10);
      state.backBuffer[y][x] = { char: '·', fg: colorVal };
    }
  }

  // 2. Render a UI Box on top using layout engine
  box({
    size: 50,
    border: 'none'
  }, ({ text }) => {
    const header = layoutBox(color.bold("🛰️  BUNTI RENDER LOOP"), { 
      align: 'center', 
      width: 50, 
      border: 'rounded', 
      borderColor: color.magenta 
    });

    const panel = layoutBox(
      color.blue("CORE TELEMETRY\n") + 
      `FRAME: ${color.yellow(frame.toString().padStart(6, '0'))}\n` +
      `RESOLUTION: ${color.green(width + 'x' + height)}\n` +
      `PALETTE: ${color.green('SUCCESS')} | ${color.yellow('WARNING')} | ${color.red('ERROR')}`,
      {
        border: 'rounded',
        borderColor: color.cyan,
        padding: [1, 2],
        width: 50
      }
    );

    text(joinVertical(header, panel));
  });

  frame++;
}, {
  fps: 30,
  alternateBuffer: true,
  hideCursor: true
});
