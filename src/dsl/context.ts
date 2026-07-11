/**
 * Bunti DSL context factories: the common per-closure context, the direct
 * (screen-buffer) box renderer, and the top-level screen context.
 */

import pc from 'picocolors';
import { bg, createGradient, darken, fg, lighten, rgb } from '../colors';
import {
  type PlacedRectInput,
  type PlacedRectOptions,
  type Rect,
  type RectInput,
  resolveRect as resolveGeometryRect,
  resolvePlacedRect,
  type SplitOptions,
  splitRect as splitGeometryRect,
} from '../geometry';
import { icon, replaceEmojis } from '../icons';
import {
  joinHorizontal,
  joinVertical,
  type ListOptions,
  blit as layoutBlit,
  box as layoutBox,
  gradient as layoutGradient,
  list as layoutList,
  table as layoutTable,
  viewport as layoutViewport,
  wallpaper as layoutWallpaper,
  rect,
  type TableOptions,
} from '../layout';
import type { Cell, RGB, ScreenState } from '../state';
import { visibleWidth } from '../utils';
import { createHooks } from './hooks';
import { createInteraction } from './interaction';
import { compositeLayer, createLayerScreenState } from './layers';
import { createMotion } from './motion';
import {
  type BuntiContext,
  type DSLBoxOptions,
  type DSLState,
  KEYS,
  type LayerOptions,
} from './types';

function boxBorderInset(options: DSLBoxOptions): number {
  return options.border === 'none' || !options.border ? 0 : 1;
}

function resolveBoxArea(
  parent: Rect,
  options: DSLBoxOptions,
  contentWidth: number,
  contentHeight: number,
): Rect {
  return resolvePlacedRect(parent, {
    x: options.x,
    y: options.y,
    width:
      options.anchor === 'top' || options.anchor === 'bottom'
        ? parent.width
        : options.width,
    height: options.height,
    anchor: options.anchor,
    contentWidth,
    contentHeight,
  });
}

function resolveBoxInnerArea(area: Rect, options: DSLBoxOptions): Rect {
  const borderInset = boxBorderInset(options);
  const px = options.padding?.[1] ?? 0;
  const py = options.padding?.[0] ?? 0;

  return {
    x: area.x + borderInset + px,
    y: area.y + borderInset + py,
    width: Math.max(0, area.width - borderInset * 2 - px * 2),
    height: Math.max(0, area.height - borderInset * 2 - py * 2),
  };
}

const buntiColor = {
  ...pc,
  darken,
  lighten,
  rgb,
  fg,
  bg,
  dim: (text: string) => fg({ r: 96, g: 102, b: 118 }, text),
} as typeof pc & {
  darken: typeof darken;
  lighten: typeof lighten;
  rgb: typeof rgb;
  fg: typeof fg;
  bg: typeof bg;
};

/**
 * Common Context Factory: Provided to every closure.
 */
function createDSLContext(
  state: ScreenState,
  dslState: DSLState,
  availableW: number,
  availableH: number,
  offsetX: number = 0,
  offsetY: number = 0,
  isRoot: boolean = false,
): BuntiContext {
  const hooks = createHooks(state);
  const motion = createMotion(state, hooks.useState);
  const interaction = createInteraction(state, (bounds) =>
    ctx.resolveRect(bounds),
  );

  const ctx: BuntiContext = {
    color: buntiColor,
    state,
    width: availableW,
    height: availableH,
    area: { x: offsetX, y: offsetY, width: availableW, height: availableH },
    isRoot,
    offsetX,
    offsetY,
    get cursorX() {
      const currentFlow = dslState.activeContents.join('');
      const lines = currentFlow.split('\n');
      return visibleWidth(lines[lines.length - 1]!);
    },
    get cursorY() {
      const currentFlow = dslState.activeContents.join('');
      return Math.max(0, currentFlow.split('\n').length - 1);
    },
    mouseX: state.mouseX,
    mouseY: state.mouseY,
    mouseButton: state.mouseButton,
    isMouseDown: state.isMouseDown,
    lastKey: state.lastKey,
    focusedId: state.focusedId,
    elapsedTime: Date.now() - state.startTime,

    text(str: string | number) {
      dslState.activeContents.push(replaceEmojis(String(str)));
      return ctx;
    },

    ...motion,
    ...hooks,
    ...interaction,

    resolveRect(bounds: RectInput) {
      return resolveGeometryRect(
        { x: offsetX, y: offsetY, width: availableW, height: availableH },
        {
          ...bounds,
          y: bounds.y ?? ctx.cursorY,
        },
      );
    },

    resolveLocalRect(bounds: PlacedRectInput, options?: PlacedRectOptions) {
      return resolvePlacedRect(
        { x: 0, y: 0, width: availableW, height: availableH },
        bounds,
        options,
      );
    },

    split(options: SplitOptions) {
      return splitGeometryRect(
        { x: 0, y: 0, width: availableW, height: availableH },
        options,
      );
    },

    list(id: string, items: string[], options: ListOptions = {}) {
      const [selectedIndex, setSelectedIndex] = ctx.useState(`${id}_index`, 0);
      const isFocused = ctx.focusable(id);

      if (isFocused && options.interactive !== false) {
        if (state.lastKey === KEYS.UP)
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        if (state.lastKey === KEYS.DOWN)
          setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1));
      }

      const content = layoutList(
        items,
        {
          ...options,
          focusedIndex: selectedIndex,
          focusStyle: isFocused ? options.focusStyle : (s) => pc.dim(s),
          selectedBg: isFocused ? options.selectedBg : undefined,
        },
        availableW,
      );

      dslState.activeContents.push(content);
      return ctx;
    },

    table(rows: string[][], options: TableOptions = {}) {
      const content = layoutTable(rows, options, availableW);
      dslState.activeContents.push(content);
      return ctx;
    },

    icon(name: string) {
      return icon(name);
    },

    blit(x: number, y: number, content: string, style: Partial<Cell> = {}) {
      layoutBlit(state, x, y, content, style);
      return ctx;
    },

    rect(x: number, y: number, w: number, h: number, style: Partial<Cell>) {
      rect(state, x, y, w, h, style);
      return ctx;
    },

    viewport(
      content: string,
      width: number,
      height: number,
      scrollY: number = 0,
    ) {
      return layoutViewport(content, width, height, scrollY);
    },

    span(options: { color?: any }, callback: (sub: BuntiContext) => void) {
      const subContents: string[] = [];
      dslState.stack.push(dslState.activeContents);
      dslState.activeContents = subContents;

      callback(ctx);

      dslState.activeContents = dslState.stack.pop()!;
      const combined = subContents.join('');

      let styled = combined;
      if (typeof options.color === 'function') {
        styled = options.color(combined);
      } else if (options.color !== undefined) {
        styled = fg(options.color, combined);
      }

      dslState.activeContents.push(styled);
      return styled;
    },

    box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void) {
      if (options.zIndex !== undefined) {
        const { zIndex, ...layeredOptions } = options;
        ctx.layer(zIndex, (layerCtx) => {
          layerCtx.box(layeredOptions, callback);
        });
        return '';
      }

      const preContentW = options.width === undefined ? availableW : 0;
      const preContentH = options.height === undefined ? availableH : 0;
      const preArea = resolveBoxArea(
        ctx.area,
        options,
        preContentW,
        preContentH,
      );
      const innerArea = resolveBoxInnerArea(preArea, options);

      const subContents: string[] = [];
      dslState.stack.push(dslState.activeContents);
      dslState.activeContents = subContents;

      const subCtx = createDSLContext(
        state,
        dslState,
        innerArea.width,
        innerArea.height,
        innerArea.x,
        innerArea.y,
      );
      callback(subCtx);

      dslState.activeContents = dslState.stack.pop()!;

      const innerContent = subContents.join('');
      const styledBox = layoutBox(
        innerContent,
        options,
        availableW,
        availableH,
      );

      if (!options.detach) {
        dslState.activeContents.push(styledBox);
      }
      return styledBox;
    },

    layer(
      zIndexOrOptions: number | LayerOptions | ((sub: BuntiContext) => void),
      maybeCallback?: (sub: BuntiContext) => void,
    ) {
      const callback =
        typeof zIndexOrOptions === 'function' ? zIndexOrOptions : maybeCallback;
      if (!callback) return ctx;

      const zIndex =
        typeof zIndexOrOptions === 'number'
          ? zIndexOrOptions
          : typeof zIndexOrOptions === 'object'
            ? (zIndexOrOptions.zIndex ?? 0)
            : 0;

      const layerState = createLayerScreenState(state);
      const layerDslState: DSLState = {
        activeContents: [],
        stack: [],
        layers: dslState.layers,
        layerOrder: dslState.layerOrder,
      };

      const layerCtx = createDSLContext(
        layerState,
        layerDslState,
        availableW,
        availableH,
        offsetX,
        offsetY,
        isRoot,
      );
      layerCtx.box = createDirectBoxRenderer(
        layerState,
        layerDslState,
        layerCtx,
      );

      callback(layerCtx);

      const flow = layerDslState.activeContents.join('');
      if (flow) layoutBlit(layerState, offsetX, offsetY, flow);

      dslState.layerOrder = layerDslState.layerOrder + 1;
      dslState.layers.push({
        zIndex,
        order: layerDslState.layerOrder,
        buffer: layerState.backBuffer,
      });

      return ctx;
    },

    joinHorizontal(...blocks: string[]) {
      return joinHorizontal(...blocks);
    },

    joinVertical(...blocks: string[]) {
      return joinVertical(...blocks);
    },

    wallpaper(input: any) {
      if (typeof input === 'object' && 'colors' in input) {
        layoutGradient(state, input.colors, { direction: input.direction });
      } else if (Array.isArray(input)) {
        layoutGradient(state, input);
      } else if (typeof input === 'object' && 'color' in input) {
        ctx.wallpaper(input.color);
      } else {
        layoutWallpaper(state, { bg: input });
      }
    },

    gradient: (opts: {
      colors: (string | number | RGB)[];
      direction?: 'vertical' | 'horizontal';
      steps?: number;
    }) => ({
      colors: createGradient(opts.colors, opts.steps || 10),
      direction: opts.direction || 'vertical',
      steps: opts.steps || 10,
    }),

    rgb,

    requestStop() {
      state.requestStop?.();
    },

    flushFlow() {},
  };
  return ctx;
}

function createDirectBoxRenderer(
  state: ScreenState,
  dslState: DSLState,
  base: BuntiContext,
) {
  return (
    options: DSLBoxOptions,
    callback: (ctx: BuntiContext) => void,
  ): string => {
    if (options.zIndex !== undefined) {
      const { zIndex, ...layeredOptions } = options;
      base.layer(zIndex, (layerCtx) => {
        layerCtx.box(layeredOptions, callback);
      });
      return '';
    }

    const boxOptions: DSLBoxOptions =
      options.anchor === 'top' || options.anchor === 'bottom'
        ? { ...options, width: base.width }
        : options;

    const hasFixedSize =
      boxOptions.width !== undefined &&
      boxOptions.width !== 'auto' &&
      boxOptions.height !== undefined &&
      boxOptions.height !== 'auto';

    if (hasFixedSize) {
      const preArea = resolveBoxArea(base.area, boxOptions, 0, 0);
      const innerArea = resolveBoxInnerArea(preArea, boxOptions);

      if (boxOptions.bgColor || boxOptions.color) {
        rect(state, preArea.x, preArea.y, preArea.width, preArea.height, {
          char: ' ',
          bg: boxOptions.bgColor,
          fg: boxOptions.color === 'blank' ? undefined : boxOptions.color,
        });
      }

      const styledBox = layoutBox('', boxOptions, base.width, base.height);
      layoutBlit(state, preArea.x, preArea.y, styledBox);

      const subContents: string[] = [];
      dslState.stack.push(dslState.activeContents);
      dslState.activeContents = subContents;

      const subCtx = createDSLContext(
        state,
        dslState,
        innerArea.width,
        innerArea.height,
        innerArea.x,
        innerArea.y,
      );
      callback(subCtx);

      dslState.activeContents = dslState.stack.pop()!;

      const contentStr = subContents.join('');
      if (contentStr) {
        const styledContent = layoutBox(
          contentStr,
          {
            width: innerArea.width,
            height: innerArea.height,
            align: boxOptions.align,
            valign: boxOptions.valign,
            wrap: boxOptions.wrap,
            border: 'none',
            padding: [0, 0],
          },
          innerArea.width,
          innerArea.height,
        );
        layoutBlit(state, innerArea.x, innerArea.y, styledContent);
      }

      return styledBox;
    }

    const subContents: string[] = [];
    dslState.stack.push(dslState.activeContents);
    dslState.activeContents = subContents;

    const preAreaTemp = resolveBoxArea(
      base.area,
      boxOptions,
      base.width,
      base.height,
    );
    const innerAreaTemp = resolveBoxInnerArea(preAreaTemp, boxOptions);

    const subCtx = createDSLContext(
      state,
      dslState,
      innerAreaTemp.width,
      innerAreaTemp.height,
      innerAreaTemp.x,
      innerAreaTemp.y,
    );
    callback(subCtx);

    dslState.activeContents = dslState.stack.pop()!;

    const contentStr = subContents.join('');
    const styledBox = layoutBox(
      contentStr,
      boxOptions,
      base.width,
      base.height,
    );

    const lines = styledBox.split('\n');
    const lineWidths = lines.map(visibleWidth);
    const boxArea = resolveBoxArea(
      base.area,
      boxOptions,
      lineWidths.length > 0 ? Math.max(...lineWidths) : 0,
      lines.length,
    );

    if (boxOptions.bgColor || boxOptions.color) {
      rect(state, boxArea.x, boxArea.y, boxArea.width, boxArea.height, {
        char: ' ',
        bg: boxOptions.bgColor,
        fg: boxOptions.color === 'blank' ? undefined : boxOptions.color,
      });
    }

    layoutBlit(state, boxArea.x, boxArea.y, styledBox);
    return styledBox;
  };
}

/**
 * Top-level Screen Context
 */
export function createScreenContext(state: ScreenState): BuntiContext {
  state.hookCounter = 0;
  const previousFocusableIds = state.focusableIds;

  if (state.lastKey === KEYS.TAB && previousFocusableIds.length > 0) {
    const idx = previousFocusableIds.indexOf(state.focusedId || '');
    const nextIdx = (idx + 1) % previousFocusableIds.length;
    state.focusedId = previousFocusableIds[nextIdx];
  }

  state.focusableIds = []; // Rebuild from this frame's rendered focusables.
  state.hitboxes = new Map(); // Rebuild from this frame's interactive geometry.

  const dslState: DSLState = {
    activeContents: [],
    stack: [],
    layers: [],
    layerOrder: 0,
  };

  const base = createDSLContext(
    state,
    dslState,
    state.width,
    state.height,
    0,
    0,
    true,
  );

  const flushFlow = () => {
    const flow = dslState.activeContents.join('');
    if (flow) layoutBlit(state, 0, 0, flow);

    dslState.layers
      .sort((a, b) => a.zIndex - b.zIndex || a.order - b.order)
      .forEach((layer) => {
        compositeLayer(state, layer.buffer);
      });
  };

  const boxOverride = createDirectBoxRenderer(state, dslState, base);

  return {
    ...base,
    box: boxOverride as any,
    flushFlow,
    requestStop: () => {
      state.requestStop?.();
    },
  };
}
