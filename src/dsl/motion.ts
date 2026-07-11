/**
 * Bunti DSL motion helpers: animate, typewriter, flicker, fade.
 */

import { fade } from '../colors';
import type { ScreenState } from '../state';
import type { BuntiContext, TypewriterOptions } from './types';

function graphemes(text: string): string[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

type Motion = Pick<BuntiContext, 'animate' | 'fade' | 'typewriter' | 'flicker'>;

export function createMotion(
  state: ScreenState,
  useState: BuntiContext['useState'],
): Motion {
  return {
    animate(
      duration: number,
      options: { loop?: boolean; delay?: number; id?: string } = {},
    ) {
      const now = Date.now();
      const start = options.id
        ? useState(`${options.id}_start`, now)[0]
        : state.startTime;
      const elapsed = now - start - (options.delay || 0);
      if (elapsed < 0) return 0;
      if (options.loop) return (elapsed % duration) / duration;
      return Math.min(1, elapsed / duration);
    },

    fade,

    typewriter(text: string, options: TypewriterOptions = {}) {
      const now = Date.now();
      const start = options.id
        ? useState(`${options.id}_start`, now)[0]
        : state.startTime;
      const delay = options.delay ?? 0;
      const elapsed = Math.max(0, now - start - delay);
      const cps = options.cps ?? 24;
      const chars = graphemes(text);
      const rawIndex = Math.floor((elapsed / 1000) * cps);
      const index =
        options.loop && chars.length > 0
          ? rawIndex % (chars.length + 1)
          : Math.min(chars.length, rawIndex);
      const blinkRate = options.blinkRate ?? 450;
      const showCursor =
        options.blink === false ||
        Math.floor(elapsed / blinkRate) % 2 === 0 ||
        index < chars.length;

      return {
        text: chars.slice(0, index).join(''),
        cursor: showCursor ? (options.cursor ?? '█') : ' ',
        done: index >= chars.length,
        index,
        progress: chars.length === 0 ? 1 : index / chars.length,
      };
    },

    flicker(intensity: number = 0.5) {
      return Math.random() > 1 - intensity;
    },
  };
}
