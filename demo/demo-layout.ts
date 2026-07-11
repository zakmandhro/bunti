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

export interface DemoViewport {
  x: number;
  y: number;
  w: number;
  h: number;
  rect: Rect;
  place: (input: PlacedRectInput) => Rect;
  split: (options: SplitOptions) => Rect[];
}

export type DemoBounds = DemoViewport;

export interface DemoOptions extends ScreenOptions {
  header?: boolean;
  footer?: boolean | 'telemetry';
  wallpaper?: Parameters<BuntiContext['wallpaper']>[0];
  exitHint?: string;
  padding?: number | [x: number, y: number];
}

const DEFAULT_DEMO_OPTIONS = {
  fps: 10,
  alternateBuffer: true,
  hideCursor: true,
  nerdFont: true,
  mouse: true,
  keyboard: true,
  defaultFg: 'silver',
  header: true,
  footer: 'telemetry',
  wallpaper: '#0a0a0b',
  exitHint: 'q',
  padding: 0,
} satisfies DemoOptions;

function viewportPadding(padding: DemoOptions['padding']) {
  if (Array.isArray(padding)) return { x: padding[0], y: padding[1] };
  return { x: padding ?? 0, y: padding ?? 0 };
}

export async function demo(
  title: string,
  contentRender: (ctx: BuntiContext, bounds: DemoViewport) => void,
  options: DemoOptions = {},
) {
  await bunti.init({ nerdFont: true });
  const config = { ...DEFAULT_DEMO_OPTIONS, ...options };
  const {
    header,
    footer,
    wallpaper: wallpaperColor,
    exitHint,
    padding,
    ...screenOptions
  } = config;

  bunti.render((ctx) => {
    const { color, width, height, wallpaper, icon } = ctx;
    if (ctx.lastKey === 'q') ctx.requestStop();

    wallpaper(wallpaperColor);

    if (header) {
      Header(ctx, {
        title: title.toUpperCase(),
        leftIcon: icon('bunti'),
        rightLabel: exitHint,
      });
    }

    if (footer) {
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
    }

    const chromeTop = header ? 2 : 0;
    const chromeBottom = footer ? 2 : 0;
    const pad = viewportPadding(padding);
    const rect: Rect = {
      x: pad.x,
      y: chromeTop + pad.y,
      width: Math.max(0, width - pad.x * 2),
      height: Math.max(0, height - chromeTop - chromeBottom - pad.y * 2),
    };
    const bounds: DemoViewport = {
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      rect,
      place: (input) => resolvePlacedRect(rect, input),
      split: (options) => splitRect(rect, options),
    };

    contentRender(ctx, bounds);
  }, screenOptions);
}
