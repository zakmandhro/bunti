import { Box, Header } from '../src/components';
import type { BuntiContext } from '../src/dsl';
import {
  bunti,
  type PlacedRectInput,
  type Rect,
  resolvePlacedRect,
  type SplitOptions,
  splitRect,
} from '../src/index';
import type { ScreenOptions } from '../src/state';

export interface DemoBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  rect: Rect;
  place: (input: PlacedRectInput) => Rect;
  split: (options: SplitOptions) => Rect[];
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
    const { color, width, height, wallpaper, icon } = ctx;

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
    Box(
      ctx,
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
    const rect: Rect = {
      x: 0,
      y: 2,
      width,
      height: height - 4,
    };
    const bounds: DemoBounds = {
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      rect,
      place: (input) => resolvePlacedRect(rect, input),
      split: (options) => splitRect(rect, options),
    };

    // 5. Render Core Content
    contentRender(ctx, bounds);
  }, options);
}
