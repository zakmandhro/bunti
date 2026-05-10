import { bunti } from '../src/index';
import pc from 'picocolors';

/**
 * Bunti Functional Center Demo
 */

const state = bunti.createScreenState({
  fps: 30,
  alternateBuffer: true
});

bunti.loop(state, (s) => {
  bunti.clearBackBuffer(s);

  const content = bunti.joinVertical(
    pc.bold(pc.cyan("🛰️  BUNTI FUNCTIONAL ENGINE")),
    pc.dim("Double-buffered diffing is online"),
    "",
    pc.magenta(`Resolution: ${s.width}x${s.height}`),
    pc.yellow("This entire UI is diff-rendered!")
  );

  const ui = bunti.box(content, {
    width: Math.min(60, s.width - 4),
    height: Math.min(10, s.height - 4),
    align: 'center',
    valign: 'middle',
    border: 'rounded',
    borderColor: pc.blue,
    padding: [1, 2]
  });

  const startX = Math.floor((s.width - 60) / 2);
  const startY = Math.floor((s.height - 10) / 2);

  bunti.blit(s, Math.max(0, startX), Math.max(0, startY), ui);
});
