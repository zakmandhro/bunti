import { bunti } from '../src/index';

/**
 * Bunti Spectrum Demo
 * 
 * Showcases 24-bit TrueColor (RGB) rendering 
 * and surgical diffing at 60 FPS.
 */

bunti.render(({ wallpaper, box, color, width, height, blit, state }) => {
  const time = Date.now() / 1000;

  // 1. Draw animated TrueColor Spectrum background directly into state
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const r = Math.floor(Math.sin(time + x * 0.05) * 127 + 128);
      const g = Math.floor(Math.sin(time + y * 0.1) * 127 + 128);
      const b = Math.floor(Math.sin(time + (x + y) * 0.05) * 127 + 128);
      
      bunti.setCell(state, x, y, { char: '·', fg: { r, g, b } });
    }
  }

  // 2. High-Fidelity UI Card
  box({
    bgColor: 233,
    border: 'rounded',
    borderColor: (s: string) => color.white(s),
  }, ({ span, text }) => {
    span({ color: color.bold }, ({ text }) => {
      text(" 🌈  BUNTI TRUECOLOR SPECTRUM \n");
    });
    span({ color: color.dim }, ({ text }) => {
      text(" Surgical 24-bit RGB Diffing Engine ");
    });
  });

}, { fps: 60, alternateBuffer: true });
