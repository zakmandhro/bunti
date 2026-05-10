import { bunti } from '../src/index';
import pc from 'picocolors';

/**
 * Bunti Functional Mouse Demo
 */

const state = bunti.createScreenState({
  mouse: true,
  fps: 60,
  alternateBuffer: true
});

let lastTime = performance.now();
let frames = 0;
let fps = 0;

bunti.loop(state, (s) => {
  const now = performance.now();
  frames++;
  if (now - lastTime >= 1000) {
    fps = frames;
    frames = 0;
    lastTime = now;
  }

  // 1. Clear Back Buffer (Transparency support!)
  bunti.clearBackBuffer(s);

  // 2. Draw Grid Background
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      const isCrosshair = x === s.mouseX || y === s.mouseY;
      const isCell = x === s.mouseX && y === s.mouseY;

      if (isCell) {
        bunti.setCell(s, x, y, { char: '█', fg: 'white', bg: 'ocean' });
      } else if (isCrosshair) {
        bunti.setCell(s, x, y, { char: '░', fg: 'silver' });
      } else {
        bunti.setCell(s, x, y, { char: '·', fg: '235' });
      }
    }
  }

  // 3. Render UI Info Box using blit
  // We use the same layout functions, but now they are "blitted" into the buffer
  // Note: bunti.box() is still string-based, so we blit it.
  // We'll update the layout engine to be more functional in the next phase.
  
  // Create a styled box
  // We'll use a hack to get the centered box for now
  const ui = bunti.createStyle({
    padding: [1, 2],
    border: 'rounded',
    borderColor: pc.cyan,
  })(
    pc.bold("🖱️  MOUSE TRACKING\n") +
    `X:   ${pc.yellow(s.mouseX.toString().padStart(3))}\n` +
    `Y:   ${pc.yellow(s.mouseY.toString().padStart(3))}\n` +
    `FPS: ${pc.cyan(fps.toString())}\n` +
    `BTN: ${pc.magenta(s.mouseButton.toString())}`
  );

  bunti.blit(s, 4, 2, ui);
});
