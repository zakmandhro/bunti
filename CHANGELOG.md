# Changelog

All notable changes to Bunti are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Auto-height direct boxes: hitboxes/sub-context now match the painted rect**
  (silent blocker). A root `box()` without `height` paints vertically centered by
  its measured content, but the callback's sub-context (and every hitbox
  registered inside) was resolved BEFORE measuring, top-anchored at a
  screen-height guess — clicks landed rows above the pixels. The direct renderer
  now shares the painter's measure pass: the sub-context rect is re-placed at the
  painted rect (seeded from the previous frame so it is exact even during the
  callback from frame 2 on), and captured hitboxes are re-placed within the same
  frame. Restores the README invariant "hitboxes and rendered output share the
  same resolved rect".
- **Inline components respect the flow cursor** (silent blocker). Two `Button`s
  on one line registered IDENTICAL alone-centered hitboxes; `Button`/`Input`/
  `Link` hitboxes are now flow-anchored — placed at the cursor position and
  re-aligned with the painted content line (`align`/`valign` included) by the
  enclosing box.
- **Overlapping hitboxes: topmost wins.** One physical click used to fire EVERY
  hitbox containing the point; now only the topmost (last-registered —
  layers render later, so later registration is visually on top) reports
  hovered/pressed/clicked/hoverEnter/hoverLeave. `hitbox()` snapshots evaluate
  against the previous frame's settled rects (the frame the user was actually
  looking at); the `isHovered`/`isPressed`/`isClicked` query forms use the
  current frame's registrations.
- **Modal entrance slide no longer moves hitboxes.** The 150ms slide-in is
  paint-only (new `paintOffsetY` box option): geometry and hitboxes sit at the
  settled coordinates from the very first frame.
- README PTY harness: the `Bun.spawn` snippet failed on macOS
  (`script: tcgetattr: Operation not supported on socket` — `stdin: 'pipe'` is a
  socketpair). Replaced with the working shell-pipeline variant and documented
  the caveat.
- `ButtonProps.variant` JSDoc documents row heights (default/secondary = 3-row
  outlined; primary/danger/ghost = 1-row).

## [0.2.0] - 2026-07-11

The one batched breaking release before launch. Everything after 0.2.0 is additive.

### Breaking

- **Click semantics**: `'click'` now fires once on mouse RELEASE at the press origin
  (was: on press, repeat-firing every frame while held). `Button.onClick` fires once per
  click; code using `hitbox().pressed` as a click signal should migrate to `.clicked`.
- **Components are themed**: Button/Input/Card/Modal/Header and `list()` draw from
  `ctx.theme` tokens instead of hardcoded colors. Default visuals shift slightly
  (bunti-dark tokens); custom look = pass a theme or explicit props.
- **`Card` `theme` prop renamed to `variant`** (`theme` kept as a deprecated alias);
  `Header`'s `theme` prop is deprecated and ignored (use `ctx.themed`).
- **`ctx.color` is now Bunti's own `BuntiColor`** (vendored) — the `picocolors` peer
  dependency is gone; code relying on picocolors-specific members must update.
- **Render-loop errors reject the `render()` promise** after restoring the terminal
  (was: `console.error` into the alt screen and keep looping). Wrap `await render()` in
  try/catch or pass `onError` to keep the loop alive.
- **`once` mode no longer calls `process.exit(0)`** — your script continues after
  `await render(cb, { once: true })`.
- **Nerd Font auto-detection is real**: unknown/unsupported terminals now degrade to
  ASCII fallbacks instead of assuming Nerd Fonts everywhere. Force with `BUNTI_NF=1`
  or `render(cb, { nerdFont: true })`.
- **`Input` edits at a real cursor** (inverse-video cell, arrow/home/end movement,
  horizontal scroll) instead of append-only with a literal `█` suffix.


### Added

- **Six preset themes** converted from popular VS Code themes, shipped under the new
  `@zakmandhro/bunti/themes` subpath: `dracula`, `tokyoNight`, `catppuccinMocha`, `nord`,
  `oneDarkPro`, and `githubLight` (plus a `themes` record keyed by slug). Each is a ready
  `Theme`, hand-tuned and gated in tests on WCAG contrast (foreground/background ≥ 4.5:1,
  muted/background ≥ 2.5:1, onPrimary/primary ≥ 4.5:1). All sources are MIT-licensed;
  attribution lives in each generated module.
- Internal VS Code theme converter (`scripts/convert-vscode-theme.ts`): a pure
  `convertVSCodeTheme(json)` mapping workbench `colors` onto Bunti's semantic tokens
  (data-driven `VSCODE_TOKEN_MAP`), a string-aware JSONC stripper, `#RGBA`/`#RRGGBBAA`
  compositing over the resolved editor background, and a WCAG-driven tune pass that drops
  failing values so `createTheme` derivation takes over. Theme `include` chains are not
  supported (pre-resolve or use compiled JSON). Regenerate presets with
  `bun scripts/convert-vscode-theme.ts --presets`; inspect with `--audit`. This converter
  is the internal core of the post-launch public `fromVSCode()`.
- `theme-preview` demo upgraded into the theme-switcher skeleton: keys 1-8 live-swap
  between `darkTheme`, `lightTheme`, and all six presets via `ctx.setTheme`, rendering a
  title bar, token samples, status colors, a primary button look, and a selection swatch
  entirely from `ctx.theme` tokens.

- **Semantic theme system** (`src/theme.ts`): `Theme` with 15 semantic tokens
  (`background`, `surface`, `surfaceRaised`, `foreground`, `muted`, `primary`, `onPrimary`,
  `accent`, `border`, `focus`, `selection`, `success`, `warning`, `danger`, `info`) plus
  optional named `gradients`. Every token is a `ThemeColor` — callable as an fg-styler
  (`theme.primary('text')`) *and* usable as a color value anywhere (`bgColor`,
  `borderColor`, `wallpaper`, gradient stops) via `.rgb`/`.hex`.
- `createTheme(partial)` derives missing tokens from sparse specs (surface shifts,
  WCAG auto-contrast foreground/onPrimary, mode from background luminance) — the
  foundation for the VS Code theme converter. Built-in `darkTheme` + `lightTheme`.
- Theme threading: `bunti.render(cb, { theme })` → `ctx.theme`; `ctx.setTheme()` swaps the
  theme live and rerenders; `ctx.themed(partialOrTheme, cb)` overrides tokens for a subtree.
- Color capability tiers: `colorTier()` detects `truecolor | 256 | 16 | mono` from
  `COLORTERM`/`TERM`/`NO_COLOR` (NO_COLOR → mono per spec); `resolveColor()` quantizes RGB
  to the active tier (nearest 256 cube/gray-ramp or base-16 match); `ScreenOptions.colorTier`
  forces a tier for tests.
- Exact xterm 256-color table (`ansi256ToRGB`, `rgbTo256`, `rgbTo16`) — fixes the silent
  mid-gray fallback so `darken`/`lighten`/`fade`/gradients work on ANSI-256 codes.
- `hexToRGB` now supports `#RGBA`/`#RRGGBBAA` (alpha composited over an optional base color).
- WCAG helpers `relativeLuminance()` / `contrastText()`, and the documented `color: 'blank'`
  box option now actually picks black/white text by background luminance.
- Internal `theme-preview` demo (`bun demo theme-preview`): three token-driven boxes with
  live dark/light switching on keys 1/2.
- Vendored ANSI color engine (`src/vendor/colors.ts`, adapted from picocolors, MIT) with an
  exported `BuntiColor` interface describing the `ctx.color` surface. Bunti now has **zero
  runtime dependencies** — the `picocolors` peer dependency is gone.
- Bun-only runtime guard: `render()` now throws a friendly error when run outside the Bun
  runtime (e.g. Node.js) instead of crashing on a missing `Bun` global.
- CI workflow (`.github/workflows/ci.yml`): typecheck, lint, tests, build, and
  `npm pack --dry-run` across Bun `latest` + `1.2.x` on Ubuntu and macOS.
- Headless demo smoke tests (`bun run smoke` / `scripts/smoke-demos.ts`): every public demo
  runs detached for 8s and must exit cleanly or stay alive without writing to stderr.

### Changed

- README installation section now leads with `bun add` and notes that the Bun runtime
  (>= 1.0) is required; the npm/pnpm/yarn instructions were removed.

## [0.1.5] - 2026-07-11

### Fixed

- **Republished with compiled `dist/`** — 0.1.4 shipped stale June-9 sources missing
  `ctx.layer()`, `zIndex` compositing, and the `Modal` component. A `prepublishOnly` guard
  (typecheck + lint + test + build) now makes stale publishes impossible.
- **README Quick Start works again** — `bunti.gradient({colors})` silently returned
  `undefined` due to a namespace collision; the example now uses `ctx.gradient`.
- **`bunti.replaceEmojis` fixed** — was shadowed by an identity function; emoji → Nerd Font
  swapping now works through the namespace.

### Performance

- **~40× faster draw hot path** — `replaceEmojis()` built 33 regexes per call, per cell
  (~12ms of the 16.7ms 60fps frame budget at 120×40). Now one precompiled alternation +
  ASCII fast paths: the same full-screen animated draw pass measures ~0.4ms/frame.

[Unreleased]: https://github.com/zakmandhro/bunti/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/zakmandhro/bunti/releases/tag/v0.1.5
