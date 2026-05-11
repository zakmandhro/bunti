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
    const { box, color, width, height, wallpaper, icon } = ctx;
    
    // 1. Base Layer (Deep Tactical Navy)
    wallpaper(233);

    const W = Math.min(width - 8, 100);

    // 2. Standardized Minimalist Header (Single Row, 100% Width)
    box({
      x: 0,
      y: 0,
      width: '100%',
      height: 1,
      bgColor: 'white',
      border: 'none',
      padding: [0, 2]
    }, ({ text }) => {
      const iconStr = color.fg('plasma', icon('bunti'));
      const titleStr = color.fg(236, `Bunti Demo ▶ ${color.bold(title)}`);
      const exitStr = color.dim('^C');
      
      const innerW = width - 4; // width - padding[1]*2
      const titleW = title.length + 13; // "Bunti Demo ▶ " is 13 chars
      
      const leftPad = Math.floor((innerW - titleW) / 2) - 1; // -1 for icon
      const rightPad = Math.ceil((innerW - titleW) / 2) - 2; // -2 for ^C
      
      const fullStr = `${iconStr}${' '.repeat(Math.max(0, leftPad))}${titleStr}${' '.repeat(Math.max(0, rightPad))}${exitStr}`;
      text(fullStr);
    });
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
    // Header takes y: 0. Spacer at y: 1. Content starts at y: 2.
    // Footer takes row y: height - 1. Spacer at height - 2. End at height - 3.
    const bounds: DemoBounds = {
      x: 0,
      y: 2,
      w: width,
      h: height - 4,
      centerW: (targetW: number) => Math.max(0, Math.floor((width - targetW) / 2))
    };

    // 5. Render Core Content
    contentRender(ctx, bounds);
  }, options);
}
