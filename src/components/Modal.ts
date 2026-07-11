import { fade, isThemeColor } from '../colors';
import type { BuntiContext } from '../dsl';
import { clamp01, easeOutCubic } from '../easing';
import type { RGB } from '../state';

/** Props for Modal. */
export interface ModalProps {
  /** Dialog width in cells. */
  width: number;
  /** Dialog height in rows. */
  height: number;
  /** Border glyph set (default 'double'). */
  border?:
    | 'default'
    | 'rounded'
    | 'double'
    | 'dashed'
    | 'dotted'
    | 'frame'
    | 'thick-frame'
    | 'classic'
    | 'none';
  /** Border color (default theme.border). */
  borderColor?: any;
  /** Surface color (default theme.surfaceRaised). */
  bgColor?: any;
  /** Horizontal content alignment (default 'center'). */
  align?: 'left' | 'center' | 'right';
  /** Vertical content alignment. */
  valign?: 'top' | 'middle' | 'bottom';
  /** [vertical, horizontal] padding inside the border, in cells. */
  padding?: [number, number];
  /** Keys the entrance animation when multiple modals coexist. */
  id?: string;
  /** Layer z-index the modal composites at (default 100). */
  zIndex?: number;
  /** Backdrop dim 0..1 under the modal; `false` or 0 disables (default 0.55). */
  backdrop?: number | false;
  /** Drop shadow under the modal surface (default true). */
  shadow?: boolean;
  /** 150ms fade + slide-in entrance (default true). */
  entrance?: boolean;
}

/** Entrance animation length. */
const ENTRANCE_MS = 150;
/** A modal unseen for this long counts as closed; reopening replays the entrance. */
const REOPEN_MS = 250;

/** Colors the entrance can interpolate (not gradients/styler functions). */
function fadeable(color: unknown): color is string | number | RGB {
  if (isThemeColor(color)) return true;
  if (typeof color === 'string' || typeof color === 'number') return true;
  return typeof color === 'object' && color !== null && 'r' in color;
}

/**
 * Modal dialog: renders on its own layer with a dimmed backdrop and drop
 * shadow, centered, with a 150ms fade/slide-in entrance. Surface and border
 * derive from ctx.theme tokens; every visual default can be overridden or
 * disabled via props.
 */
export function Modal(
  ctx: BuntiContext,
  props: ModalProps,
  callback: (sub: BuntiContext) => void,
): string {
  const theme = ctx.theme;
  const backdrop = props.backdrop === false ? 0 : (props.backdrop ?? 0.55);
  const shadow = props.shadow ?? true;

  // Entrance progress, keyed per modal id in componentState. `lastSeen`
  // tracks presence so a reopened modal (absent > REOPEN_MS) replays the
  // entrance instead of reusing its stale open timestamp.
  let progress = 1;
  if (props.entrance !== false) {
    const key = `__modal_entrance:${props.id ?? 'modal'}`;
    const now = Date.now();
    const record = ctx.state.componentState.get(key) as
      | { openedAt: number; lastSeen: number }
      | undefined;
    if (!record || now - record.lastSeen > REOPEN_MS) {
      ctx.state.componentState.set(key, { openedAt: now, lastSeen: now });
      progress = 0;
    } else {
      record.lastSeen = now;
      progress = clamp01((now - record.openedAt) / ENTRANCE_MS);
    }
  }
  const eased = easeOutCubic(progress);

  let rendered = '';
  ctx.layer(
    {
      zIndex: props.zIndex ?? 100,
      backdrop: backdrop > 0 ? backdrop : undefined,
      shadow,
    },
    (overlay) => {
      const modalW = props.width;
      const modalH = props.height;

      // Slide: enter from 1 row above the resting position.
      const slide = Math.round(1 - eased);
      const localX = Math.max(0, Math.floor((overlay.width - modalW) / 2));
      const localY = Math.max(
        0,
        Math.floor((overlay.height - modalH) / 2) - slide,
      );
      const x = overlay.offsetX + localX;
      const y = overlay.offsetY + localY;

      // Fade: surface bg and border sweep from the screen background color
      // to their final colors over the entrance.
      const targetBg = props.bgColor ?? theme.surfaceRaised;
      const surfaceBg =
        eased < 1 && fadeable(targetBg)
          ? fade(theme.background.rgb, targetBg, eased)
          : targetBg;
      const targetBorder = props.borderColor ?? theme.border;
      const borderColor =
        eased < 1 && fadeable(targetBorder)
          ? fade(theme.background.rgb, targetBorder, eased)
          : targetBorder;

      // 1. Solid background rect: the raised-surface plate the dialog
      // floats on (guarantees full coverage under sparse content).
      overlay.rect(x, y, modalW, modalH, { char: ' ', bg: surfaceBg });

      // 2. The box enclosing the modal content.
      rendered = overlay.box(
        {
          x: localX,
          y: localY,
          width: modalW,
          height: modalH,
          border: props.border ?? 'double',
          borderColor,
          // Content fallback fg: explicit ANSI styling in content still wins.
          color: theme.foreground,
          align: props.align ?? 'center',
          valign: props.valign,
          padding: props.padding,
        },
        callback,
      );
    },
  );
  return rendered;
}
