# AGENTS.md

Instructions for agents building terminal apps with Bunti as a library.

## Goal

Use Bunti to build polished terminal apps much faster than with Ink, with significantly less code.

Bunti is not React for the terminal. Do not build component trees, providers, reducers, or reconciliation-style abstractions unless the user explicitly asks for them. Build the screen directly with Bunti's contextual DSL and drawing primitives.

## Import Pattern

Use the library API:

```ts
import { bunti } from '@zakmandhro/bunti';
import { Box, Card, Button, Input } from '@zakmandhro/bunti/components';
```

Start apps with:

```ts
bunti.render((ctx) => {
  // draw the whole frame here
}, {
  fps: 60,
  keyboard: true,
  mouse: true,
  alternateBuffer: true,
  hideCursor: true,
  defaultFg: 'silver',
});
```

## Core Mental Model

- The render callback redraws the desired frame from state.
- Bunti writes into virtual buffers, then flushes only the final terminal diff.
- Use `ctx.useState(key, initial)` for state across frames.
- Use `ctx.usePersistentState(key, initial)` only for values that should survive app restarts.
- Use `ctx.lastKey` for keyboard input.
- Use `ctx.requestStop()` to quit.

## Choose The Right Primitive

- Use `ctx.box()` or `Box(ctx, props, cb)` for layout and aligned panels.
- Use `ctx.text()` inside boxes for normal flow text.
- Use `ctx.rect()` for filled areas, bars, panels, charts, and backgrounds.
- Use `ctx.blit()` for exact-position text, sprites, labels, numbers, and ASCII art.
- Use `ctx.wallpaper()` for the screen background.
- Use `ctx.gradient()` for polished backgrounds.
- Use `ctx.layer(zIndex, cb)` for modals, HUDs, popovers, menus, notifications, and effects that must appear above other content.
- Use `zIndex` on `box()` when a whole box should be promoted to a layer.

## Layout Rules

- Prefer named constants for repeated dimensions: `PANEL_W`, `SIDEBAR_W`, `ROW_H`, `GAP_X`, `GAP_Y`.
- Terminal cells are taller than they are wide. A 1-row vertical gap often looks balanced with a 2-column horizontal gap.
- Pass local `x` and `y` to `box()` inside a context.
- Use absolute coordinates for `rect()` and `blit()` when drawing directly.
- Use `ctx.offsetX` and `ctx.offsetY` when converting local component coordinates to absolute drawing coordinates.
- Prefer `border: 'none'` for dense canvases and work surfaces unless the border is part of the design.
- Keep text inside fixed-size areas centered with explicit padding or helper functions.

## Layers

Use layers instead of relying on draw order for overlays.

```ts
ctx.layer(10, (overlay) => {
  overlay.box({
    x: 8,
    y: 4,
    width: 32,
    height: 7,
    border: 'none',
    bgColor: { r: 20, g: 20, b: 30 },
    align: 'center',
    valign: 'middle',
  }, (modal) => {
    modal.text('Confirm action');
  });
});
```

Layer behavior:

- Normal content renders first.
- Layers render into transparent virtual buffers.
- Layers composite by `zIndex`, then declaration order.
- The terminal receives only the final composed diff.

## App Patterns

For agent TUIs, dashboards, workflow tools, and other interactive terminal apps:

- Keep domain logic in plain TypeScript functions.
- Use `useState` for view state, selected items, active panels, transient UI state, animation timestamps, and input values.
- Use higher-order components (`Card`, `Button`, `Input`, etc.) for common controls.
- Use direct drawing (`rect` and `blit`) for dense dashboards, progress surfaces, custom visualizations, maps, timelines, and canvas-like regions.
- Use `ctx.layer()` for command palettes, detail panels, confirmations, notifications, transient status, and HUD-style overlays.
- Use `fps: 60`.
- Make animations time-based, not frame-count-based.
- Prefer stable geometry with color/brightness interpolation for smooth terminal effects.
- Avoid effects that add/remove many cells step-by-step unless that stepping is intentional.

## Animation

- Use `ctx.animate(duration, { id, loop })` for simple repeated timelines.
- Use timestamps in state for transient UI events such as panel entrances, notifications, progress pulses, or status flashes.
- Use easing helpers from Bunti when available, such as `easeInOutCubic`, `easeOutCubic`, and `clamp01`.
- Keep animation durations short enough to feel responsive. For UI transitions, around `150-250ms` usually feels good at 60fps.

## First-Run Checklist

Before giving the user code:

- Make sure the app imports from `@zakmandhro/bunti`, not repo-relative paths.
- Make sure every state value used across frames has a stable string key.
- Make sure keyboard apps enable `keyboard: true`.
- Make sure mouse apps enable `mouse: true`.
- Make sure overlays use `ctx.layer()` or `zIndex`.
- Make sure fixed-size surfaces use named constants instead of magic coordinate math.
- Make sure debug/default preview state is removed.
- Run the app if possible and fix TypeScript/runtime errors before responding.
