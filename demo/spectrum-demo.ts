import { bunti } from '../src/index';

/**
 * Bunti Spectrum Demo
 * 
 * Showcases 24-bit TrueColor (RGB) rendering 
 * and surgical diffing at 60 FPS.
 */

const state = bunti.createScreenState({ fps: 60, alternateBuffer: true });

bunti.loop(state, (s) => {
  const time = Date.now() / 1000;

  // 1. Draw animated TrueColor Spectrum background
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      // Procedural RGB values
      const r = Math.floor(Math.sin(time + x * 0.05) * 127 + 128);
      const g = Math.floor(Math.sin(time + y * 0.1) * 127 + 128);
      const b = Math.floor(Math.sin(time + (x + y) * 0.05) * 127 + 128);
      
      bunti.setCell(s, x, y, { char: '·', fg: { r, g, b } });
    }
  }

  // 2. High-Fidelity UI Card
  const content = bunti.box(
    bunti.color.bold(" 🌈  BUNTI TRUECOLOR SPECTRUM \n") +
    bunti.color.dim(" Surgical 24-bit RGB Diffing Engine "),
    {
      padding: [1, 3],
      border: 'rounded',
      borderColor: (s: string) => bunti.color.white(s),
      align: 'center'
    }
  );

  const w = 40;
  const h = 5;
  const x = Math.floor((s.width - w) / 2);
  const y = Math.floor((s.height - h) / 2);

  // Paint semi-transparent black card
  bunti.rect(s, x, y, w, h, { char: ' ', bg: '233' });
  bunti.blit(s, x, y, content);
});
