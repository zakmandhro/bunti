/**
 * Bunti High-Level Contextual DSL
 * Scoped closure API with contextual capabilities via trait-based composition.
 */

import pc from 'picocolors';
import {
  bg,
  createGradient,
  darken,
  fg,
  type Gradient,
  lighten,
  rgb,
} from './colors';
import {
  type Rect,
  type RectInput,
  resolveRect as resolveGeometryRect,
} from './geometry';
import { icon, init, replaceEmojis } from './icons';
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
  resolveSize,
  type SideColors,
  type SizeUnit,
  type StyleOptions,
  type TableOptions,
} from './layout';
import { flush, loop } from './render';
import {
  type Cell,
  clearBackBuffer,
  createScreenState,
  type Hitbox,
  type RGB,
  type ScreenOptions,
  type ScreenState,
} from './state';
import { visibleWidth } from './utils';

// --- Traits (Contextual Capabilities) ---

export const KEYS = {
  UP: 'up',
  DOWN: 'down',
  RIGHT: 'right',
  LEFT: 'left',
  ENTER: 'enter',
  ESCAPE: 'escape',
  TAB: 'tab',
  BACKSPACE: 'backspace',
  SPACE: ' ',
};
export interface DSLBoxOptions extends StyleOptions {
  bgColor?: string | number | RGB | Gradient;
  color?: string | number | RGB | 'blank';
  x?: number;
  y?: number;
  anchor?: 'top' | 'bottom';
  size?: 'auto' | number;
  title?: string;
  titleStyle?: (s: string) => string;
  id?: string;
  borderColor?: string | number | RGB | ((s: string) => string) | SideColors;
  detach?: boolean; // If true, the string is returned but NOT appended to the flow
}

/**
 * The interface for the contextual builder provided to closures.
 */
export interface BuntiContext {
  color: typeof pc & {
    darken: typeof darken;
    lighten: typeof lighten;
    rgb: typeof rgb;
    fg: typeof fg;
    bg: typeof bg;
  };
  state: ScreenState;
  width: number;
  height: number;
  area: Rect;
  offsetX: number;
  offsetY: number;
  readonly cursorX: number;
  readonly cursorY: number;
  mouseX: number;
  mouseY: number;
  mouseButton: number;
  isMouseDown: boolean;
  lastKey?: string;
  focusedId?: string;
  elapsedTime: number;

  text(str: string | number): BuntiContext;
  icon(name: string): string; // Pure string return for template literal safety
  blit(
    x: number,
    y: number,
    content: string,
    style?: Partial<Cell>,
  ): BuntiContext;
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    style: Partial<Cell>,
  ): BuntiContext;
  viewport(
    content: string,
    width: number,
    height: number,
    scrollY?: number,
  ): string;
  span(
    options: { color?: string | number | RGB | ((s: string) => string) },
    callback: (sub: BuntiContext) => void,
  ): string;
  box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void): string;
  joinHorizontal(...blocks: string[]): string;
  joinVertical(...blocks: string[]): string;
  wallpaper(
    input: string | number | RGB | RGB[] | Gradient | { color: any },
  ): void;
  gradient(options: {
    colors: (string | number | RGB)[];
    direction?: 'vertical' | 'horizontal';
    steps?: number;
  }): Gradient;
  rgb(r: number, g: number, b: number): RGB;

  // State & Focus
  useState<T>(key: string, initial: T): [T, (val: T) => void];
  focusable(id: string): boolean;
  isFocused(id: string): boolean;
  focus(id: string): void;
  focusNext(): void;
  hitbox(
    id: string,
    bounds: RectInput,
  ): {
    box: Hitbox;
    hovered: boolean;
    pressed: boolean;
    clicked: boolean;
  };
  measureWidth(width: SizeUnit | undefined, contentWidth?: number): number;
  measureHeight(height: SizeUnit | undefined, contentHeight?: number): number;
  resolveRect(bounds: RectInput): Rect;
  isHovered(id: string): boolean;
  isPressed(id: string): boolean;
  isClicked(id: string): boolean;

  list(id: string, items: string[], options?: ListOptions): BuntiContext;
  table(rows: string[][], options?: TableOptions): BuntiContext;

  // Animation
  animate(
    duration: number,
    options?: { loop?: boolean; delay?: number; id?: string },
  ): number;
  flicker(intensity?: number): boolean;

  // Async data
  useAsync<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { interval?: number },
  ): {
    data: T | undefined;
    loading: boolean;
    error: Error | undefined;
  };

  requestStop(): void;
  flushFlow(): void;
}

/**
 * The DSL state container allowing stable references with dynamic capture targets.
 */
interface DSLState {
  activeContents: string[];
  stack: string[][];
}

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
): BuntiContext {
  const ctx: BuntiContext = {
    color: { ...pc, darken, lighten, rgb, fg, bg } as any,
    state,
    width: availableW,
    height: availableH,
    area: { x: offsetX, y: offsetY, width: availableW, height: availableH },
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

    animate(
      duration: number,
      options: { loop?: boolean; delay?: number; id?: string } = {},
    ) {
      const now = Date.now();
      const start = options.id
        ? ctx.useState(`${options.id}_start`, now)[0]
        : state.startTime;
      const elapsed = now - start - (options.delay || 0);
      if (elapsed < 0) return 0;
      if (options.loop) return (elapsed % duration) / duration;
      return Math.min(1, elapsed / duration);
    },

    flicker(intensity: number = 0.5) {
      return Math.random() > 1 - intensity;
    },

    useAsync<T>(
      key: string,
      fetcher: () => Promise<T>,
      options: { interval?: number } = {},
    ) {
      const interval = options.interval ?? 0;
      const dataKey = `${key}_data`;
      const loadingKey = `${key}_loading`;
      const errorKey = `${key}_error`;
      const lastFetchKey = `${key}_lastFetch`;
      const fetchingKey = `${key}_fetching`;

      if (!state.componentState.has(loadingKey)) {
        state.componentState.set(loadingKey, true);
      }

      const lastFetch = state.componentState.get(lastFetchKey) as
        | number
        | undefined;
      const isFetching = state.componentState.get(fetchingKey) as boolean;
      const now = Date.now();
      const shouldFetch =
        !isFetching &&
        (lastFetch === undefined ||
          (interval > 0 && now - lastFetch >= interval));

      if (shouldFetch) {
        state.componentState.set(fetchingKey, true);
        state.componentState.set(lastFetchKey, now);
        fetcher()
          .then((result) => {
            state.componentState.set(dataKey, result);
            state.componentState.set(loadingKey, false);
            state.componentState.set(errorKey, undefined);
          })
          .catch((err: Error) => {
            state.componentState.set(errorKey, err);
            state.componentState.set(loadingKey, false);
          })
          .finally(() => {
            state.componentState.set(fetchingKey, false);
          });
      }

      return {
        data: state.componentState.get(dataKey) as T | undefined,
        loading: state.componentState.get(loadingKey) as boolean,
        error: state.componentState.get(errorKey) as Error | undefined,
      };
    },

    useState<T>(key: string, initial: T): [T, (val: T) => void] {
      if (!state.componentState.has(key)) {
        state.componentState.set(key, initial);
      }
      return [
        state.componentState.get(key),
        (val: T) => state.componentState.set(key, val),
      ];
    },

    focusable(id: string) {
      if (!state.focusableIds.includes(id)) {
        state.focusableIds.push(id);
      }
      if (!state.focusedId) state.focusedId = id;
      return state.focusedId === id;
    },

    isFocused(id: string) {
      return state.focusedId === id;
    },

    focus(id: string) {
      state.focusedId = id;
    },

    focusNext() {
      if (state.focusableIds.length === 0) return;
      const idx = state.focusableIds.indexOf(state.focusedId || '');
      const nextIdx = (idx + 1) % state.focusableIds.length;
      state.focusedId = state.focusableIds[nextIdx];
    },

    hitbox(id: string, bounds: RectInput) {
      const rect = ctx.resolveRect(bounds);
      const box: Hitbox = { id, ...rect };
      state.hitboxes.set(id, box);
      const hovered =
        state.mouseX >= box.x &&
        state.mouseX < box.x + box.width &&
        state.mouseY >= box.y &&
        state.mouseY < box.y + box.height;
      const pressed = hovered && state.isMouseDown && state.mouseButton === 0;
      const clicked = hovered && state.lastKey === 'click';

      return { box, hovered, pressed, clicked };
    },

    measureWidth(width: SizeUnit | undefined, contentWidth: number = 0) {
      return Math.max(0, resolveSize(width, availableW, contentWidth));
    },

    measureHeight(height: SizeUnit | undefined, contentHeight: number = 0) {
      return Math.max(0, resolveSize(height, availableH, contentHeight));
    },

    resolveRect(bounds: RectInput) {
      return resolveGeometryRect(
        { x: offsetX, y: offsetY, width: availableW, height: availableH },
        {
          ...bounds,
          y: bounds.y ?? ctx.cursorY,
        },
      );
    },

    isHovered(id: string) {
      const box = state.hitboxes.get(id);
      if (!box) return false;
      return (
        state.mouseX >= box.x &&
        state.mouseX < box.x + box.width &&
        state.mouseY >= box.y &&
        state.mouseY < box.y + box.height
      );
    },

    isPressed(id: string) {
      return ctx.isHovered(id) && state.isMouseDown && state.mouseButton === 0;
    },

    isClicked(id: string) {
      return ctx.isHovered(id) && state.lastKey === 'click';
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

      const content = layoutList(items, {
        ...options,
        focusedIndex: selectedIndex,
        focusStyle: isFocused ? options.focusStyle : (s) => pc.dim(s),
      });

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
      const borderOffset = options.border === 'none' || !options.border ? 0 : 2;
      const px = options.padding?.[1] ?? 0;
      const py = options.padding?.[0] ?? 0;

      // Measure parent-relative dimensions
      const resolvedW = resolveSize(options.width, availableW, 0);
      const innerW = resolvedW
        ? Math.max(0, resolvedW - borderOffset - px * 2)
        : availableW;

      const resolvedH = resolveSize(options.height, availableH, 0);
      const innerH = resolvedH
        ? Math.max(0, resolvedH - borderOffset - py * 2)
        : availableH;

      const subContents: string[] = [];
      dslState.stack.push(dslState.activeContents);
      dslState.activeContents = subContents;

      const boxW = resolvedW || availableW;
      const boxH = resolvedH || availableH;

      let absX = offsetX;
      let absY = offsetY;

      if (options.x !== undefined) {
        absX += options.x;
      } else {
        absX += Math.max(0, Math.floor((availableW - boxW) / 2));
      }

      if (options.y !== undefined) {
        absY += options.y;
      } else if (options.anchor === 'top') {
        absY = offsetY;
      } else if (options.anchor === 'bottom') {
        absY = offsetY + availableH - boxH;
      } else {
        absY += Math.max(0, Math.floor((availableH - boxH) / 2));
      }

      const subCtx = createDSLContext(
        state,
        dslState,
        innerW,
        innerH,
        absX + borderOffset / 2 + px,
        absY + borderOffset / 2 + py,
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

/**
 * Top-level Screen Context
 */
export function createScreenContext(state: ScreenState): BuntiContext {
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
  };

  const base = createDSLContext(state, dslState, state.width, state.height);

  const flushFlow = () => {
    const flow = dslState.activeContents.join('');
    if (flow) layoutBlit(state, 0, 0, flow);
  };

  // Override box for top-level to handle auto-centering and direct-to-buffer rendering
  const boxOverride = (
    options: DSLBoxOptions,
    callback: (ctx: BuntiContext) => void,
  ) => {
    // 1. Resolve Anchor dimensions
    if (options.anchor === 'top') {
      options.x = 0;
      options.y = 0;
      options.width = state.width;
    } else if (options.anchor === 'bottom') {
      options.x = 0;
      options.width = state.width;
    }

    const borderOffset = options.border === 'none' || !options.border ? 0 : 2;
    const px = options.padding?.[1] ?? 0;
    const py = options.padding?.[0] ?? 0;

    // 2. Resolve dimensions (top-level uses screen width)
    const resolvedW = resolveSize(options.width, state.width, 0);
    const innerW = resolvedW
      ? Math.max(0, resolvedW - borderOffset - px * 2)
      : state.width;
    const resolvedH = resolveSize(options.height, state.height, 0);
    const innerH = resolvedH
      ? Math.max(0, resolvedH - borderOffset - py * 2)
      : state.height;

    const subContents: string[] = [];
    dslState.stack.push(dslState.activeContents);
    dslState.activeContents = subContents;

    let x = options.x !== undefined ? options.x : 0; // Temp assignment for offset
    let y = options.y !== undefined ? options.y : 0;
    if (options.anchor === 'top') {
      y = 0;
    }

    const subCtx = createDSLContext(
      state,
      dslState,
      innerW,
      innerH,
      x + borderOffset / 2 + px,
      y + borderOffset / 2 + py,
    );
    callback(subCtx);

    dslState.activeContents = dslState.stack.pop()!;

    const contentStr = subContents.join('');
    const styledBox = layoutBox(contentStr, options, state.width, state.height);

    const lines = styledBox.split('\n');
    const lineWidths = lines.map(visibleWidth);
    const boxW = resolveSize(
      options.width,
      state.width,
      lineWidths.length > 0 ? Math.max(...lineWidths) : 0,
    );
    const boxH = resolveSize(options.height, state.height, lines.length);

    x =
      options.x !== undefined
        ? options.x
        : Math.max(0, Math.floor((state.width - boxW) / 2));
    y =
      options.y !== undefined
        ? options.y
        : Math.max(0, Math.floor((state.height - boxH) / 2));

    if (options.anchor === 'top') {
      y = 0;
    } else if (options.anchor === 'bottom') {
      y = state.height - boxH;
    }

    if (options.bgColor || options.color) {
      rect(state, x, y, boxW, boxH, {
        char: ' ',
        bg: options.bgColor,
        fg: options.color === 'blank' ? undefined : options.color,
      });
    }

    layoutBlit(state, x, y, styledBox);
    return base;
  };

  return {
    ...base,
    box: boxOverride as any,
    flushFlow,
    requestStop: () => {
      state.requestStop?.();
    },
  };
}

/**
 * Primary Entry Point
 */
export async function render(
  callback: ((b: BuntiContext) => void) | string,
  options: ScreenOptions & { once?: boolean } = {},
) {
  // Sync apply forced options first
  if (options.nerdFont !== undefined) {
    await init({ nerdFont: options.nerdFont });
  } else {
    // Start detection in background, don't await!
    init();
  }

  const state = createScreenState(options);

  const tick = () => {
    clearBackBuffer(state);
    const b = createScreenContext(state);
    if (typeof callback === 'string') {
      b.blit(0, 0, callback);
    } else {
      callback(b);
    }
    b.flushFlow();
    flush(state);
  };

  if (options.once) {
    tick();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
        process.exit(0);
      }, 50);
    });
    return;
  }

  await loop(state, (_s) => tick());
}
