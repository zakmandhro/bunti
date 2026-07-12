# Getting Started

Bunti is a Bun-native terminal UI engine: you describe each frame with a functional DSL, and a double-buffered diff renderer sends only the changed cells to the terminal.

## Install

```bash
bun add @zakmandhro/bunti
```

> Bunti requires the [Bun](https://bun.sh) runtime (≥ 1.0). It uses Bun-native APIs for rendering, so Node.js is not supported — you'll get a friendly error instead of a crash if you try.

## Try it in one line

No install needed — run the demos straight from npm:

```bash
bunx @zakmandhro/bunti demo mission-control   # themed dashboard, keys 1-8 switch themes
bunx @zakmandhro/bunti demo 2048              # animated game with layers & modals
bunx @zakmandhro/bunti doctor                 # what can YOUR terminal do?
```

## The mental model

Five ideas carry the whole library:

1. **Immediate mode** — your render callback redraws the entire frame from state, every tick. No component tree, no reconciliation, no virtual DOM.
2. **Keyed state** — `ctx.useState('score', 0)` persists values across frames by key.
3. **Layers for overlap** — anything that sits on top of other content (modals, HUDs, popovers) goes in `ctx.layer()`. Draw order alone does not stack.
4. **Theme tokens** — style with `ctx.theme.primary`, `ctx.theme.surface`, etc., and the whole app restyles when the theme changes.
5. **Time-based motion** — animations are pure functions of elapsed time (`ctx.animate`, `ctx.transition`), so they stay smooth at any frame rate.

## Your first app

A live status panel, step by step:

```typescript
import { bunti } from '@zakmandhro/bunti';

bunti.render((ctx) => {
  const { theme, box, text } = ctx;

  // 1. Quit key — check input at the top of the frame
  if (ctx.lastKey === 'q') {
    ctx.requestStop();
    return;
  }

  // 2. State that survives across frames
  const [checks, setChecks] = ctx.useState('checks', 0);
  if (ctx.keyPressed('enter')) setChecks(checks + 1);

  // 3. Draw the frame from state
  box(
    {
      width: 44,
      border: 'rounded',
      borderColor: theme.border,
      bgColor: theme.surface,
      padding: [1, 2],
      title: ' STATUS ',
    },
    (panel) => {
      panel.text(theme.primary('All systems nominal\n\n'));
      panel.text(`${ctx.icon('check')} health checks run: ${checks}\n`);
      panel.text(theme.muted('enter: run check · q: quit'));
    },
  );
}, { fps: 30, keyboard: true });
```

Run it with `bun app.ts`. Press <kbd>enter</kbd> a few times, then <kbd>q</kbd> — the terminal is restored perfectly on exit (and on crashes, too).

## Where next

- [Box Model & Layout](/layout) — how sizing, padding, and positioning work
- [Components](/components) — Button, Input, Card, Modal, Spinner, Progress, Link
- [Theming](/theming) — semantic tokens and the VS Code presets
- [Input & Mouse](/input-and-mouse) — keys, clicks, hover, and hitboxes

## Testing headlessly

Bunti renders fine to plain pipes, and `{ once: true }` renders a single frame and resolves — ideal for CI and agent-driven verification. Keyboard input needs a real PTY. See [Engine → Headless testing](/engine#headless-testing) for the recipes.
