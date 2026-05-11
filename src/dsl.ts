/**
 * Bunti High-Level Contextual DSL
 * Scoped closure API with contextual capabilities via trait-based composition.
 */

import { ScreenState, createScreenState, clearBackBuffer, ScreenOptions, Cell, RGB } from './state';
import { 
  gradient as layoutGradient, wallpaper as layoutWallpaper, rect, blit as layoutBlit, box as layoutBox, viewport as layoutViewport, 
  joinHorizontal, joinVertical, StyleOptions, list as layoutList, ListOptions, SideColors, resolveSize, table as layoutTable, TableOptions
} from './layout';
import { icon, init, replaceEmojis } from './icons';
import { loop, flush } from './render';
import { visibleWidth } from './utils';
import { fg, bg, createGradient, rgb, Gradient, darken, lighten } from './colors';
import pc from 'picocolors';

// --- Traits (Contextual Capabilities) ---

export const KEYS = {
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',
  ENTER: '\r',
  ESCAPE: '\x1b',
  TAB: '\t',
  BACKSPACE: '\x7f',
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
  color: typeof pc & { darken: typeof darken, lighten: typeof lighten, rgb: typeof rgb, fg: typeof fg, bg: typeof bg };
  state: ScreenState;
  width: number;
  height: number;
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
  blit(x: number, y: number, content: string, style?: Partial<Cell>): BuntiContext;
  rect(x: number, y: number, w: number, h: number, style: Partial<Cell>): BuntiContext;
  viewport(content: string, width: number, height: number, scrollY?: number): string;
  span(options: { color?: string | number | RGB | ((s: string) => string) }, callback: (sub: BuntiContext) => void): string;
  box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void): string;
  joinHorizontal(...blocks: string[]): string;
  joinVertical(...blocks: string[]): string;
  wallpaper(input: string | number | RGB | RGB[] | Gradient | { color: any }): void;
  gradient(options: { colors: (string | number | RGB)[], direction?: 'vertical' | 'horizontal', steps?: number }): Gradient;
  rgb(r: number, g: number, b: number): RGB;

  // State & Focus
  useState<T>(key: string, initial: T): [T, (val: T) => void];
  focusable(id: string): boolean;
  isFocused(id: string): boolean;
  focus(id: string): void;
  focusNext(): void;

  list(id: string, items: string[], options?: ListOptions): BuntiContext;
  table(rows: string[][], options?: TableOptions): BuntiContext;

  // Animation
  animate(duration: number, options?: { loop?: boolean, delay?: number, id?: string }): number;
  flicker(intensity?: number): boolean;
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
function createDSLContext(state: ScreenState, dslState: DSLState, availableW: number, availableH: number, offsetX: number = 0, offsetY: number = 0): BuntiContext {
  const ctx: BuntiContext = {
    color: { ...pc, darken, lighten, rgb, fg, bg } as any,
    state,
    width: availableW,
    height: availableH,
    offsetX,
    offsetY,
    get cursorX() {
      const currentFlow = dslState.activeContents.join('');
      const lines = currentFlow.split('\n');
      return visibleWidth(lines[lines.length - 1]);
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

    animate(duration: number, options: { loop?: boolean, delay?: number, id?: string } = {}) {
      const now = Date.now();
      const start = options.id ? this.useState(`${options.id}_start`, now)[0] : state.startTime;
      const elapsed = now - start - (options.delay || 0);
      if (elapsed < 0) return 0;
      if (options.loop) return (elapsed % duration) / duration;
      return Math.min(1, elapsed / duration);
    },

    flicker(intensity: number = 0.5) {
      return Math.random() > (1 - intensity);
    },

    useState<T>(key: string, initial: T): [T, (val: T) => void] {
      if (!state.componentState.has(key)) {
        state.componentState.set(key, initial);
      }
      return [
        state.componentState.get(key),
        (val: T) => state.componentState.set(key, val)
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

    list(id: string, items: string[], options: ListOptions = {}) {
      const [selectedIndex, setSelectedIndex] = this.useState(`${id}_index`, 0);
      const isFocused = this.focusable(id);
      
      if (isFocused) {
        if (state.lastKey === KEYS.UP) setSelectedIndex(Math.max(0, selectedIndex - 1));
        if (state.lastKey === KEYS.DOWN) setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1));
      }

      const content = layoutList(items, {
        ...options,
        focusedIndex: selectedIndex,
        focusStyle: isFocused ? options.focusStyle : (s) => pc.dim(s)
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

    viewport(content: string, width: number, height: number, scrollY: number = 0) {
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
      const borderOffset = (options.border === 'none' || !options.border) ? 0 : 2;
      const px = options.padding?.[1] ?? 0;
      const py = options.padding?.[0] ?? 0;

      // Measure parent-relative dimensions
      const resolvedW = resolveSize(options.width, availableW, 0);
      const innerW = resolvedW ? Math.max(0, resolvedW - borderOffset - (px * 2)) : availableW;
      
      const resolvedH = resolveSize(options.height, availableH, 0);
      const innerH = resolvedH ? Math.max(0, resolvedH - borderOffset - (py * 2)) : availableH;

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

      const subCtx = createDSLContext(state, dslState, innerW, innerH, absX + (borderOffset/2) + px, absY + (borderOffset/2) + py);
      callback(subCtx);
      
      dslState.activeContents = dslState.stack.pop()!;
      
      const innerContent = subContents.join('');
      const styledBox = layoutBox(innerContent, options, availableW, availableH);
      
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
        this.wallpaper(input.color);
      } else {
        layoutWallpaper(state, { bg: input });
      }
    },

    gradient: (opts: { colors: (string | number | RGB)[], direction?: 'vertical' | 'horizontal', steps?: number }) => ({
      colors: createGradient(opts.colors, opts.steps || 10),
      direction: opts.direction || 'vertical',
      steps: opts.steps || 10
    }),

    rgb
  };
  return ctx;
}

/**
 * Top-level Screen Context
 */
export function createScreenContext(state: ScreenState): BuntiContext {
  state.focusableIds = []; // Clear for this frame

  const dslState: DSLState = {
    activeContents: [],
    stack: []
  };

  const base = createDSLContext(state, dslState, state.width, state.height);
  
  if (state.lastKey === KEYS.TAB) {
    base.focusNext();
  }

  // Override box for top-level to handle auto-centering and direct-to-buffer rendering
  const boxOverride = (options: DSLBoxOptions, callback: (ctx: BuntiContext) => void) => {
    // 1. Resolve Anchor dimensions
    if (options.anchor === 'top') {
      options.x = 0; options.y = 0; options.width = state.width;
    } else if (options.anchor === 'bottom') {
      options.x = 0; options.width = state.width;
    }

    const borderOffset = (options.border === 'none' || !options.border) ? 0 : 2;
    const px = options.padding?.[1] ?? 0;
    const py = options.padding?.[0] ?? 0;

    // 2. Resolve dimensions (top-level uses screen width)
    const resolvedW = resolveSize(options.width, state.width, 0);
    const innerW = resolvedW ? Math.max(0, resolvedW - borderOffset - (px * 2)) : state.width;
    const resolvedH = resolveSize(options.height, state.height, 0);
    const innerH = resolvedH ? Math.max(0, resolvedH - borderOffset - (py * 2)) : state.height;

    const subContents: string[] = [];
    dslState.stack.push(dslState.activeContents);
    dslState.activeContents = subContents;

    let x = options.x !== undefined ? options.x : 0; // Temp assignment for offset
    let y = options.y !== undefined ? options.y : 0;
    if (options.anchor === 'top') {
      y = 0;
    }

    const subCtx = createDSLContext(state, dslState, innerW, innerH, x + (borderOffset/2) + px, y + (borderOffset/2) + py);
    callback(subCtx);

    dslState.activeContents = dslState.stack.pop()!;

    const contentStr = subContents.join('');
    const styledBox = layoutBox(contentStr, options, state.width, state.height);

    const lines = styledBox.split('\n');
    const boxW = resolveSize(options.width, state.width, Math.max(...lines.map(visibleWidth)));
    const boxH = resolveSize(options.height, state.height, lines.length);

    x = options.x !== undefined ? options.x : Math.max(0, Math.floor((state.width - boxW) / 2));
    y = options.y !== undefined ? options.y : Math.max(0, Math.floor((state.height - boxH) / 2));

    if (options.anchor === 'top') {
      y = 0;
    } else if (options.anchor === 'bottom') {
      y = state.height - boxH;
    }

    if (options.bgColor || options.color) {
      rect(state, x, y, boxW, boxH, { 
        char: ' ', 
        bg: options.bgColor, 
        fg: options.color === 'blank' ? undefined : options.color 
      });
    }

    layoutBlit(state, x, y, styledBox);
    return base;
  };

  return {
    ...base,
    box: boxOverride as any
  };
}

/**
 * Primary Entry Point
 */
export async function render(callback: (b: BuntiContext) => void, options: ScreenOptions & { once?: boolean } = {}) {
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
    callback(b);
    flush(state);
  };

  if (options.once) {
    tick();
    setTimeout(() => process.exit(0), 50);
  } else {
    loop(state, (s) => tick());
  }
}
