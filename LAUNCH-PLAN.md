# 🥟 Bunti Launch Plan

> Locked 2026-07-11 by Zak + Nova. Supersedes ROADMAP.md, TASKS.md, and bunti-space-station-gaps.md for launch sequencing.
> Built from a 9-agent codebase gap analysis + 3-lens critique panel; load-bearing claims verified by execution.

## North star

Bunti is **the** terminal UI library for Bun users building with coding agents — from simple dialogs to
complex dashboards — with web-app-grade visual polish, first-class themes/icons/animation, and an API so
ergonomic that LLMs use it correctly without a cheat sheet.

**Launch bar:** the X thread must be jaw-dropping, and the first 100 developers who try Bunti must hit
zero embarrassments. Everything else ships as post-launch weekly drops (better for momentum anyway).

**Success metric:** 500 GitHub stars or 1k `bunx` demo runs in week 1.

## Locked decisions

- **Bun-only runtime** (friendly error on Node); zero runtime dependencies (picocolors vendored).
- **Structure:** ~2.5-week Launch Cut → weekly post-launch drops. No mega-launch.
- **Versions:** `0.1.5` = hotfix republish (npm 0.1.4 is stale June-9 src with no `layer()`).
  `0.2.0` = the ONE batched breaking release at API freeze. Additive-only after.
- **npm name:** dispute unscoped `bunti` (blocked by squatted empty `bunty`); publish under
  `@zakmandhro/bunti` meanwhile.
- **X thread P1:** the agent one-shot (prompt → Claude Code → dashboard running). Theme-switch hero is P2.
  Platformer is a launch-week day-3 drop, not a launch blocker.

## Launch Cut

### Days 1–2 — Stop the bleeding
1. `prepublishOnly` build guard; fix README Quick Start (`bunti.gradient` collision returns `undefined`);
   fix `bunti.replaceEmojis` shadowing; verify tarball; **republish 0.1.5**.
2. `replaceEmojis()` hot-path fix (~12ms/frame → ~1-2ms; precompiled regex + ASCII fast path + `Cell.raw`).
3. Repo hygiene: docs GitHub link, `.DS_Store`, stale `.screenshots`, absorbed perf branch.
4. **vhs recording spike** — verify Nerd Font/truecolor fidelity before scheduling any video work.
5. **Split `dsl.ts`** (1,134-line merge funnel) into modules — prerequisite for parallel tracks.
6. Draft npm name-dispute email for Zak.

### Week 1 — Foundation (4 parallel tracks)
- **A (core spine):** crash-safety terminal restore; render-loop error teardown; input parser rewrite —
  `keyQueue` of KeyEvents (`press|repeat|release` shape frozen now), CSI/SS3 modifiers, bare-ESC
  disambiguation, click-on-release + fire-once, hover enter/leave, held-key heuristic.
  *Exit criterion: box moves smoothly with held arrows.*
- **B (theming):** semantic-token `Theme` + `ctx.theme` + live `setTheme`; interface frozen day 1;
  256→RGB table, WCAG `blank` auto-contrast, `#RRGGBBAA` support.
- **C (icons, isolated):** codegen all 10,764 Nerd Font glyphs by name + `IconName` union type
  (verified tsc-viable), `icons-full` subpath export, fix `register()`, curated-set degradation audit.
- **D:** vendor picocolors + `BuntiColor` type + Bun guard; CI on push/PR + demo smoke tests;
  color capability tiers (`COLORTERM`/`NO_COLOR`, RGB→256 quantization).

### Week 2 — Design system + launch surface
1. All 6 components rewired to theme tokens (mode-aware hover/pressed).
2. VS Code theme converter as **internal build-time script** → 6 shipped presets (Dracula, Tokyo Night,
   Catppuccin Mocha, Nord, One Dark Pro, GitHub Light). Public `fromVSCode()` = week +1 headline.
3. Env-first terminal detection (Ghostty case bug, kitty/WezTerm/Alacritty/tmux) wired into
   icons/colors/render. Async probes deferred.
4. Modal→`layer()` + backdrop scrim + drop shadows; OSC 22 pointer cursor; Spinner/Progress/Link only.
5. Motion minimum: ~12 easings, `lerp`/`lerpRect`, `ctx.transition` (enter/exit), `stagger`,
   `ctx.dt`/`ctx.frame`; transparent blit + halfblock canvas.
6. Input cursor-core (arrows/home/end, insert-at-cursor, scroll window).
7. SGR text attributes (italic/underline/dim/strike).
8. **Ship 0.2.0** — all breaking changes batched. Acceptance test: space-station deletes its 437-line
   homegrown theme and consumes `ctx.theme`.

### Week 2.5 — Freeze, rehearse, record
1. JSDoc + `@example` on the entire public surface, once, against the frozen API (agents read `.d.ts`).
2. Dev-mode diagnostics (buffered, flushed on exit): keyboard-not-enabled, keyless hook drift,
   unknown color/icon nearest-match, overlay-without-layer.
3. **Fresh agent eval loop** (runs from week 1): new agent session + published RC + one prompt →
   fix every trip-wire → record the best run as the thread's P1 asset.
4. **Launch rehearsal gate (day −3):** RC on npm `next`; fresh-machine `bunx` runs of every demo;
   terminal matrix (Ghostty, kitty, iTerm2, WezTerm, VS Code, Apple Terminal @ 256-color);
   every README snippet executed verbatim.
5. "Agent Fleet Mission Control" dashboard rebuild (theme-switcher canvas); `bunx @zakmandhro/bunti demo`
   bin; record assets (vhs for keyboard demos, manual Ghostty capture for mouse shots).

## Post-launch cadence
- **Launch day 3:** platformer drop (halfblock pixels, held keys, FPS overlay).
- **Week +1:** public `fromVSCode()` · `ctx.md()` markdown renderer · Select + ScrollBox ·
  Input word-jumps + bracketed paste.
- **Week +2:** Checkbox/Toggle/Tabs · Textarea · async terminal probes + `bunti doctor` ·
  kitty keyboard protocol · spring + effects kit · honest benchmark rewrite + perf post.

## Distribution (parallel from week 1)
awesome-bun PR · Bun Discord · tag Bun on launch day · Show HN draft · docs deployed with 30-second
quickstart · GitHub Discussions + issue templates + seeded good-first-issues · positioning vs Ink
("needs React and Node; Bunti is Bun-native, zero-dep, built for coding agents") and OpenTUI ·
package keywords fixed. All outward-facing posts get Zak's sign-off.

## The X thread shot list
1. **Agent one-shot** (12s): one-paragraph prompt into Claude Code → cut to the generated dashboard running.
2. **Theme hero** (8s): Mission Control, hotkeys cycle Dracula → Tokyo Night → Catppuccin → GitHub Light live.
3. **2048** (10s): slide/merge/celebration burst — "zero deps, 60fps diff renderer, pure Bun."
4. **Login mouse demo** (8s, manual capture): hover link, pointer cursor, click, progress fill.
5. **`bunx @zakmandhro/bunti demo`** (5s): zero-install CTA.
6. *(Day 3 follow-up: platformer.)*
