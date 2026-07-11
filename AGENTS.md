# AGENTS.md

How to build good terminal apps with Bunti. The API itself is documented
where you'll actually read it — JSDoc in the package's `dist/*.d.ts` and
the quick reference in `llms.txt`; dev-mode hints on stderr catch the
common wiring mistakes. This file covers what types can't: layout taste
and app structure.

Start from `examples/starter.ts` in the repo — it is the shape most
dashboards want (header bar, `ctx.split` tracks, keyboard selection,
themed panels).

## Not React

Bunti is immediate mode: the render callback redraws the whole frame
from state and Bunti flushes only the terminal diff. Do not build
component trees, providers, reducers, or reconciliation-style
abstractions unless the user explicitly asks. Build the screen directly
with `ctx` primitives; keep domain logic in plain TypeScript functions
outside the render callback.

## Layout model

- Everything is a cell rect. `x`/`y` are local to the current context:
  the whole screen at the root, the padded interior inside a `box()`.
  Use `ctx.offsetX`/`ctx.offsetY` to convert local to absolute when
  drawing with `rect()`/`blit()`.
- Root-level `box()` paints directly to the screen and **centers**
  itself unless you pass `x`/`y`. Nested boxes join the parent's text
  flow. Both return the rendered string.
- Carve screens with `ctx.split({ direction, constraints: [24, '1fr'] })`
  and draw one box per track — don't hand-compute column math.
- Terminal cells are taller than wide: a 1-row vertical gap balances a
  2-column horizontal gap, and `padding: [1, 2]` looks square-ish.
- Name repeated dimensions (`SIDEBAR_W`, `ROW_H`, `GAP_X`) instead of
  scattering magic numbers.
- Prefer `border: 'none'` for dense canvases and work surfaces; borders
  are a design choice, not a default.

## App patterns

- `useState(key, initial)` for view state; `usePersistentState` only
  for values that must survive restarts; `useAsync(key, fetcher,
  { interval })` for data — never block the render loop.
- Components (`Card`, `Button`, `Input`, `Modal`, ...) for common
  controls; direct `rect()`/`blit()` for dense dashboards, charts,
  maps, and canvas-like regions.
- `ctx.layer()` for command palettes, confirmations, notifications, and
  HUDs — anything that overlaps other content. Draw order alone does
  not stack.
- Style from `ctx.theme` tokens (`theme.surface`, `theme.primary`,
  `theme.muted`, ...) rather than hardcoded colors, so live theme swaps
  and the built-in presets keep working.
- Animate on time, not frame count: `ctx.animate`/`ctx.transition`/
  `ctx.dt`. UI transitions feel right around 150-250ms. Prefer stable
  geometry with color/brightness interpolation over adding/removing
  cells step-by-step.

## Before handing code to the user

- Import from `@zakmandhro/bunti`, never repo-relative paths.
- Run it if possible. It renders to pipes, but keyboard input needs a
  real PTY — see the "Agent & CI testing" section of the README for a
  copy-paste PTY harness.
- Remove debug/preview state and fix TypeScript errors first.
