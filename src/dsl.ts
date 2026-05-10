/**
 * Bunti High-Level Contextual DSL
 * Scoped closure API with contextual capabilities via trait-based composition.
 */

import { ScreenState, createScreenState, clearBackBuffer } from './state';
import { gradient, wallpaper, rect, blit as layoutBlit, box as layoutBox, viewport as layoutViewport, StyleOptions } from './layout';
import { icon, init } from './icons';
import { ScreenOptions, loop, flush } from './render';
import { visibleWidth } from './utils';
import { fg, createGradient, rgb } from './colors';
import pc from 'picocolors';

// --- Traits (Contextual Capabilities) ---

export interface DSLBoxOptions extends StyleOptions {
  bgColor?: any;
  color?: any;
  x?: number;
  y?: number;
}

/**
 * Common Context Factory: Provided to every closure.
 */
function getContext(contents: string[], state: ScreenState): any {
  const ctx = {
    color: pc,
    state, // Expose raw state for advanced interactive logic
    
    text(str: string) {
      contents.push(str);
      return ctx;
    },
    
    icon(name: string) {
      return icon(name);
    },
    
    blit(x: number, y: number, content: string) {
      layoutBlit(state, x, y, content);
      return ctx;
    },

    viewport(content: string, width: number, height: number, scrollY: number = 0) {
      return layoutViewport(content, width, height, scrollY);
    },

    span(options: { color?: any }, callback: (sub: any) => void) {
      const subContents: string[] = [];
      const subCtx = getContext(subContents, state);
      callback(subCtx);
      const combined = subContents.join('');
      
      let styled = combined;
      if (typeof options.color === 'function') {
        styled = options.color(combined);
      } else if (options.color !== undefined) {
        styled = fg(options.color, combined);
      }
      
      contents.push(styled);
      return ctx;
    },

    box(options: DSLBoxOptions, callback: (sub: any) => void) {
      const subContents: string[] = [];
      const subCtx = getContext(subContents, state);
      callback(subCtx);
      
      const innerContent = subContents.join('');
      const styledBox = layoutBox(innerContent, options);
      contents.push(styledBox);
      return ctx;
    }
  };
  return ctx;
}

/**
 * Top-level Screen Context
 */
export function createScreenContext(state: ScreenState) {
  const base = getContext([], state);
  
  const screenCtx = {
    ...base,
    width: state.width,
    height: state.height,
    mouseX: state.mouseX,
    mouseY: state.mouseY,
    isMouseDown: state.isMouseDown,

    wallpaper(input: any) {
      if (typeof input === 'object' && 'type' in input && input.type === 'gradient') {
        gradient(state, input.colors, { direction: input.direction });
      } else if (Array.isArray(input)) {
        gradient(state, input);
      } else if (typeof input === 'object' && 'color' in input) {
        screenCtx.wallpaper(input.color);
      } else {
        wallpaper(state, { bg: input });
      }
    },

    gradient: (opts: { colors: any[], direction?: 'vertical' | 'horizontal', steps?: number }) => ({
      type: 'gradient' as const,
      colors: createGradient(opts.colors, opts.steps || 10),
      direction: opts.direction || 'vertical'
    }),

    rgb,

    box(options: DSLBoxOptions, callback: (ctx: any) => void) {
      const subContents: string[] = [];
      const ctx = getContext(subContents, state);
      callback(ctx);
      
      const contentStr = subContents.join('');
      const styledBox = layoutBox(contentStr, options);

      // Measurement Source of Truth
      const lines = styledBox.split('\n');
      const w = Math.max(...lines.map(visibleWidth));
      const h = lines.length;

      // Positioning: Use explicit (x,y) if provided, otherwise center
      const x = options.x !== undefined ? options.x : Math.max(0, Math.floor((state.width - w) / 2));
      const y = options.y !== undefined ? options.y : Math.max(0, Math.floor((state.height - h) / 2));

      // Paint Card Background
      if (options.bgColor || options.color) {
        rect(state, x, y, w, h, { 
          char: ' ', 
          bg: options.bgColor, 
          fg: options.color === 'blank' ? '0' : options.color 
        });
      }

      layoutBlit(state, x, y, styledBox);
    }
  };

  return screenCtx;
}

/**
 * Primary Entry Point
 */
export async function render(callback: (b: any) => void, options: ScreenOptions & { once?: boolean } = {}) {
  await init();
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
