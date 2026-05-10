import { bunti } from "../src/index";
import { BuntiContext } from "../src/dsl";
import { ScreenOptions } from "../src/state";

export interface DemoBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  centerW: (targetW: number) => number;
}

export function demo(
  title: string,
  contentRender: (ctx: BuntiContext, bounds: DemoBounds) => void,
  options: ScreenOptions = { fps: 10, alternateBuffer: true, hideCursor: true, nerdFont: true }
) {
  bunti.render((ctx) => {
    const { box, color, width, height, wallpaper } = ctx;
    
    // 1. Base Layer (Deep Tactical Navy)
    wallpaper(233);

    const W = Math.min(width - 8, 100);

    // 2. Standardized Header (Anchored Top, Relative Width)
    box({
      anchor: 'top',
      y: 1,
      width: W,
      border: 'frame',
      borderColor: color.gray,
      align: 'center',
      padding: [0, 2]
    }, ({ text }) => {
      text(`🌀 ${color.bold(`BUNTI :: ${title}`)} 🛰️`);
    });

    // 3. Standardized Footer (Anchored Bottom)
    box({
      anchor: 'bottom',
      width: '100%',
      align: 'center',
      border: 'none',
      padding: [0, 0]
    }, ({ text }) => {
      text(color.dim(` 󰇄 Screen: ${width}x${height} | Logic: Stateless | Buffer: Double `));
    });

    // 4. Calculate Inner Safe Bounds
    // Header takes rows y: 1, 2, 3. Spacer at y: 4. Content starts at y: 5.
    // Footer takes row y: height - 1. Spacer at height - 2. End at height - 3.
    // Usable height: (height - 3) - 5 + 1 = height - 7.
    const bounds: DemoBounds = {
      x: 0,
      y: 5,
      w: width,
      h: height - 7,
      centerW: (targetW: number) => Math.max(0, Math.floor((width - targetW) / 2))
    };

    // 5. Render Core Content
    contentRender(ctx, bounds);
  }, options);
}
