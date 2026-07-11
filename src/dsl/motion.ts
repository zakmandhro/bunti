/**
 * Bunti DSL motion helpers: animate, fade, typewriter, flicker, transition,
 * stagger, restartAnimation, and per-frame timing (dt / frame).
 */

import { fade } from '../colors';
import { clamp01 } from '../easing';
import type { ScreenState } from '../state';
import type { BuntiContext, TypewriterOptions } from './types';

function graphemes(text: string): string[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

/** Deterministic 0-1 hash (FNV-1a) for time-bucketed flicker. */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const identity = (t: number) => t;

/** Namespaced componentState key for transition edge tracking. */
const transitionKey = (id: string) => `_motion:transition:${id}`;

interface TransitionRecord {
  visible: boolean;
  flippedAt: number;
}

type Motion = Pick<
  BuntiContext,
  | 'animate'
  | 'fade'
  | 'typewriter'
  | 'flicker'
  | 'transition'
  | 'stagger'
  | 'restartAnimation'
  | 'dt'
  | 'frame'
>;

export function createMotion(
  state: ScreenState,
  useState: BuntiContext['useState'],
): Motion {
  return {
    // loop() owns timing: it stamps state.dt / state.frameCount each tick.
    // Outside a loop (tests, one-shot renders) both default to 0.
    dt: state.dt ?? 0,
    frame: state.frameCount ?? 0,

    animate(
      duration: number,
      options: {
        loop?: boolean | 'yoyo';
        delay?: number;
        id?: string;
        easing?: (t: number) => number;
      } = {},
    ) {
      const now = Date.now();
      const start = options.id
        ? useState(`${options.id}_start`, now)[0]
        : state.startTime;
      const elapsed = now - start - (options.delay || 0);
      const ease = options.easing ?? identity;
      if (elapsed < 0 || duration <= 0) return ease(0);
      if (options.loop === 'yoyo') {
        // 0 -> 1 -> 0 over two durations; easing applies to each leg.
        const phase = (elapsed % (duration * 2)) / duration;
        return ease(phase <= 1 ? phase : 2 - phase);
      }
      if (options.loop) return ease((elapsed % duration) / duration);
      return ease(Math.min(1, elapsed / duration));
    },

    fade,

    /**
     * Visibility-driven enter/exit progress for immediate-mode UIs.
     * Tracks visible-flag edges in componentState; `mounted` stays true
     * through the exit animation so callers keep rendering while a panel
     * animates out. Mid-animation flips retarget from the current progress
     * (no jumps).
     */
    transition(
      id: string,
      visible: boolean,
      options: {
        duration?: number;
        easing?: (t: number) => number;
        exitDuration?: number;
      } = {},
    ) {
      const now = Date.now();
      const duration = Math.max(0, options.duration ?? 300);
      const exitDuration = Math.max(0, options.exitDuration ?? duration);
      const ease = options.easing ?? identity;

      const key = transitionKey(id);
      let rec = state.componentState.get(key) as TransitionRecord | undefined;
      if (rec === undefined) {
        // First sight: visible components animate in from 0; hidden ones
        // start fully exited (mounted false immediately).
        rec = { visible, flippedAt: visible ? now : now - exitDuration - 1 };
        state.componentState.set(key, rec);
      }

      const rawAt = (r: TransitionRecord): number => {
        if (r.visible) {
          return duration <= 0 ? 1 : clamp01((now - r.flippedAt) / duration);
        }
        return exitDuration <= 0
          ? 0
          : 1 - clamp01((now - r.flippedAt) / exitDuration);
      };

      if (rec.visible !== visible) {
        // Retarget from the current raw progress so mid-animation flips
        // continue smoothly instead of restarting the full leg.
        const current = rawAt(rec);
        rec.visible = visible;
        rec.flippedAt = visible
          ? now - current * duration
          : now - (1 - current) * exitDuration;
      }

      const raw = rawAt(rec);
      return {
        progress: ease(raw),
        mounted: visible || raw > 0,
      };
    },

    /**
     * Cascading entrance progress: item `index` starts `index * delay` ms
     * into the timeline and runs for `duration` ms. The timeline is the
     * screen's elapsed time, or an animate()-style `id` clock when given
     * (restartAnimation(id) then replays the cascade).
     */
    stagger(
      index: number,
      options: {
        delay: number;
        duration: number;
        easing?: (t: number) => number;
        id?: string;
      },
    ) {
      const now = Date.now();
      const start = options.id
        ? useState(`${options.id}_start`, now)[0]
        : state.startTime;
      const elapsed = now - start - index * options.delay;
      const ease = options.easing ?? identity;
      if (options.duration <= 0) return ease(elapsed >= 0 ? 1 : 0);
      return ease(clamp01(elapsed / options.duration));
    },

    /** Resets an animate()/typewriter()/stagger() id clock to "now". */
    restartAnimation(id: string) {
      state.componentState.set(`${id}_start`, Date.now());
      (state as { requestTick?: () => void }).requestTick?.();
    },

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

    /**
     * Time-based flicker: deterministic per interval bucket (hash of the
     * bucket + id), so the flicker rate is fps-independent while keeping
     * the same visual character as the old per-frame Math.random.
     */
    flicker(
      intensity: number = 0.5,
      options: { id?: string; interval?: number } = {},
    ) {
      const interval = Math.max(1, options.interval ?? 50);
      const bucket = Math.floor((Date.now() - state.startTime) / interval);
      return hash01(`${options.id ?? ''}:${bucket}`) > 1 - intensity;
    },
  };
}
