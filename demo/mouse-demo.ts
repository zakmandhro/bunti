import { render, box as layoutBox } from '../src/index';

/**
 * Bunti Functional Mouse Demo
 */

let lastTime = performance.now();
let frames = 0;
let fps = 0;

render(({ state, box, color, width, height, mouseX, mouseY, mouseButton }) => {
  const now = performance.now();
  frames++;
  if (now - lastTime >= 1000) {
    fps = frames;
    frames = 0;
    lastTime = now;
  }

  // 1. Draw Grid Background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isCrosshair = x === mouseX || y === mouseY;
      const isCell = x === mouseX && y === mouseY;

      if (isCell) {
        state.backBuffer[y][x] = { char: '█', fg: 'white', bg: { r: 0, g: 119, b: 190 } }; // 'ocean' blue approximation
      } else if (isCrosshair) {
        state.backBuffer[y][x] = { char: '░', fg: 'silver' };
      } else {
        state.backBuffer[y][x] = { char: '·', fg: 235 };
      }
    }
  }

  // 2. Render UI Info Box
  box({
    x: 4,
    y: 2,
    border: 'none'
  }, ({ text }) => {
    text(layoutBox(
      color.bold("🖱️  MOUSE TRACKING\n") +
      `X:   ${color.yellow(mouseX.toString().padStart(3))}\n` +
      `Y:   ${color.yellow(mouseY.toString().padStart(3))}\n` +
      `FPS: ${color.cyan(fps.toString())}\n` +
      `BTN: ${color.magenta(mouseButton.toString())}`,
      {
        padding: [1, 2],
        border: 'rounded',
        borderColor: color.cyan,
      }
    ));
  });
}, {
  mouse: true,
  fps: 60,
  alternateBuffer: true
});
