# Animation & Motion

Motion in Bunti is **time-based**: helpers are pure functions of elapsed time, so they render identically at any frame rate and need zero invalidation bookkeeping — the render loop already redraws every tick.

## Progress over time

```typescript
import { easeOutCubic } from '@zakmandhro/bunti';

// 0 → 1 over 400ms, eased
const t = ctx.animate(400, { id: 'intro', easing: easeOutCubic });

// looping: true wraps 0→1→0→1…, 'yoyo' bounces 0→1→0
const pulse = ctx.animate(1200, { id: 'pulse', loop: 'yoyo' });

ctx.restartAnimation('intro'); // replay on demand
```

## Enter & exit transitions

`ctx.transition` is the key primitive for immediate-mode UIs — it keeps an element *mounted* while it animates out:

```typescript
const [open, setOpen] = ctx.useState('panel-open', false);
const t = ctx.transition('panel', open, { duration: 180 });

if (t.mounted) {
  ctx.layer({ zIndex: 10 }, (overlay) => {
    // slides in from one row up; slides back out on close
    overlay.box({ x: 10, y: 6 + Math.round(1 - t.progress), width: 30, height: 8 }, drawPanel);
  });
}
```

`progress` runs 0→1 on enter and back 1→0 on exit (retargeting mid-flight if toggled quickly); `mounted` stays `true` until the exit finishes.

## Staggered cascades

```typescript
rows.forEach((row, i) => {
  const p = ctx.stagger(i, { delay: 60, duration: 240 });
  if (p > 0) drawRow(row, p); // rows cascade in, top to bottom
});
```

## Easing & interpolation

Fourteen curves ship: `linear`, `easeIn/Out/InOut` × `Quad/Cubic/Quart`, `easeOutExpo`, `easeOutElastic`, `easeOutBounce`, `easeOutBack` — plus `lerp(a, b, t)` and `lerpRect(a, b, t)` (cell-rounded) for positions and sizes, and `ctx.fade(from, to, t)` for colors.

## Frame timing

For game loops and physics, the context exposes real timing:

```typescript
ctx.dt;          // ms since the previous frame (clamped to 100)
ctx.frame;       // tick counter
ctx.elapsedTime; // ms since render() started
```

## Text effects

- `ctx.typewriter(text, { cps, blink })` — grapheme-safe reveal with a block cursor
- `ctx.flicker(intensity, { interval })` — deterministic, time-bucketed flicker (fps-independent)

## Guidance

Terminal cells are chunky — 1-cell position steps read best over short distances. Keep UI transitions in the **150–250ms** range, prefer color/brightness interpolation for smoothness, and lean on `stagger` for expensive-looking entrances that cost nothing.
