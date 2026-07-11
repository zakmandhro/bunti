# Changelog

All notable changes to Bunti are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
