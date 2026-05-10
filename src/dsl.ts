/**
 * Bunti High-Level Contextual DSL
 * Scoped closure API with contextual capabilities via trait-based composition.
 */

import { ScreenState, createScreenState, clearBackBuffer, ScreenOptions, Cell, RGB } from './state';
import { 
  gradient as layoutGradient, wallpaper as layoutWallpaper, rect, blit as layoutBlit, box as layoutBox, viewport as layoutViewport, 
  joinHorizontal, joinVertical, StyleOptions, list as layoutList, ListOptions
} from './layout';
import { icon, init } from './icons';
import { loop, flush } from './render';
import { visibleWidth } from './utils';
import { fg, createGradient, rgb, Gradient } from './colors';
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
  bgColor?: string | number | RGB;
  color?: string | number | RGB | 'blank';
  x?: number;
  y?: number;
  size?: 'auto' | number;
  id?: string;
}

/**
 * The interface for the contextual builder provided to closures.
 */
export interface BuntiContext {
  color: typeof pc;
  state: ScreenState;
  width: number;
  height: number;
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
  viewport(content: string, width: number, height: number, scrollY?: number): string;
  span(options: { color?: string | number | RGB | ((s: string) => string) }, callback: (sub: BuntiContext) => void): BuntiContext;
  box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void): BuntiContext;
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
function createDSLContext(state: ScreenState, dslState: DSLState): BuntiContext {
  const ctx: BuntiContext = {
    color: pc,
    state,
    width: state.width,
    height: state.height,
    mouseX: state.mouseX,
    mouseY: state.mouseY,
    mouseButton: state.mouseButton,
    isMouseDown: state.isMouseDown,
    lastKey: state.lastKey,
    focusedId: state.focusedId,
    elapsedTime: Date.now() - state.startTime,
    
    text(str: string | number) {
      dslState.activeContents.push(String(str));
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
    
    icon(name: string) {
      // Pushes NOTHING to activeContents, just returns the glyph string.
      // User must use it in a template or pass to text().
      return icon(name);
    },
    
    blit(x: number, y: number, content: string, style: Partial<Cell> = {}) {
      layoutBlit(state, x, y, content, style);
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
      return ctx;
    },

    box(options: DSLBoxOptions, callback: (sub: BuntiContext) => void) {
      if (options.size === 'auto') {
        options.width = undefined;
      } else if (typeof options.size === 'number') {
        options.width = options.size;
      }

      if (options.id) {
        const isFocused = this.focusable(options.id);
        if (isFocused) {
          if (!options.borderColor) options.borderColor = (s) => pc.cyan(s);
          if (!options.titleStyle) options.titleStyle = (s) => pc.bold(pc.cyan(s));
        } else {
          if (!options.borderColor) options.borderColor = (s) => pc.dim(s);
          if (!options.titleStyle) options.titleStyle = (s) => pc.dim(s);
        }
      }

      const subContents: string[] = [];
      dslState.stack.push(dslState.activeContents);
      dslState.activeContents = subContents;

      callback(ctx);
      
      dslState.activeContents = dslState.stack.pop()!;
      
      const innerContent = subContents.join('');
      const styledBox = layoutBox(innerContent, options);
      
      dslState.activeContents.push(styledBox);
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

  const base = createDSLContext(state, dslState);
  
  if (state.lastKey === KEYS.TAB) {
    base.focusNext();
  }

  // Override box for top-level to handle auto-centering and blitting
  const boxOverride = (options: DSLBoxOptions, callback: (ctx: BuntiContext) => void) => {
    if (options.size === 'auto') {
      options.width = undefined;
    } else if (typeof options.size === 'number') {
      options.width = options.size;
    }

    if (options.id) {
      const isFocused = base.focusable(options.id);
      if (isFocused) {
        if (!options.borderColor) options.borderColor = (s) => pc.cyan(s);
        if (!options.titleStyle) options.titleStyle = (s) => pc.bold(pc.cyan(s));
      } else {
        if (!options.borderColor) options.borderColor = (s) => pc.dim(s);
        if (!options.titleStyle) options.titleStyle = (s) => pc.dim(s);
      }
    }

    const subContents: string[] = [];
    dslState.stack.push(dslState.activeContents);
    dslState.activeContents = subContents;

    callback(base);
    
    dslState.activeContents = dslState.stack.pop()!;
    
    const contentStr = subContents.join('');
    const styledBox = layoutBox(contentStr, options);

    const lines = styledBox.split('\n');
    const w = Math.max(...lines.map(visibleWidth));
    const h = lines.length;

    const x = options.x !== undefined ? options.x : Math.max(0, Math.floor((state.width - w) / 2));
    const y = options.y !== undefined ? options.y : Math.max(0, Math.floor((state.height - h) / 2));

    if (options.bgColor || options.color) {
      rect(state, x, y, w, h, { 
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
  // Start detection in background, don't await!
  init({ nerdFont: options.nerdFont });
  
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
