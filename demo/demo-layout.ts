import { Header } from '../src/components/Header';
import type { BuntiContext } from '../src/dsl';
import { bunti } from '../src/index';
import type { ScreenOptions } from '../src/state';

export interface DemoBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  centerW: (targetW: number) => number;
}

export async function demo(
  title: string,
  contentRender: (ctx: BuntiContext, bounds: DemoBounds) => void,
  options: ScreenOptions = {
    fps: 10,
    alternateBuffer: true,
    hideCursor: true,
    nerdFont: true,
    mouse: true,
    keyboard: true,
  },
) {
  await bunti.init({ nerdFont: true });

  bunti.render((ctx) => {
    const { box, color, width, height, wallpaper, icon } = ctx;

    // 1. Base Layer (Dark Mode optimized)
    wallpaper('#0a0a0b');

    // 2. High-Order Header Component
    Header(ctx, {
      title: title.toUpperCase(),
      leftIcon: icon('bunti'),
      rightLabel: '^C',
      theme: 'light',
    });

    // 3. Standardized Footer (Anchored Bottom)
    box(
      {
        anchor: 'bottom',
        width: '100%',
        align: 'center',
        border: 'none',
        padding: [0, 0],
      },
      ({ text }) => {
        text(
          color.dim(
            ` 󰇄 Screen: ${width}x${height} | Mouse: ${ctx.mouseX},${ctx.mouseY} | Logic: Stateless `,
          ),
        );
      },
    );

    // 4. Calculate Inner Safe Bounds
    // Header takes y: 0. Spacer at y: 1. Content starts at y: 2.
    // Footer takes row y: height - 1. Spacer at height - 2. End at height - 3.
    const bounds: DemoBounds = {
      x: 0,
      y: 2,
      w: width,
      h: height - 4,
      centerW: (targetW: number) =>
        Math.max(0, Math.floor((width - targetW) / 2)),
    };

    // 5. Render Core Content
    contentRender(ctx, bounds);
  }, options);
}
