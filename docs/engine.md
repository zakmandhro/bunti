# Engine & Lifecycle

`bunti.render(callback, options)` starts the loop: each tick clears the back buffer, runs your callback, composites layers, and diffs against the front buffer — only dirty spans reach the terminal, wrapped in synchronized-output markers on terminals that support them.

## Render options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `fps` | `number` | `60` | Target frame rate (auto-throttles to 5 when the terminal loses focus) |
| `keyboard` | `boolean` | `false` | Raw-mode key capture (required for `lastKey`/`keys`/Input) |
| `mouse` | `boolean` | `false` | SGR mouse tracking (hitboxes, hover, clicks, pointer cursor) |
| `focus` | `boolean` | `false` | Terminal focus-in/out tracking |
| `alternateBuffer` | `boolean` | `false` | vim-style alternate screen; prior terminal content restored on exit |
| `hideCursor` | `boolean` | `false` | Hide the TTY cursor while running |
| `theme` | `Theme` | `darkTheme` | Semantic theme exposed as `ctx.theme` |
| `defaultFg` | color | — | Fallback foreground for plain text |
| `colorTier` | `'truecolor' \| '256' \| '16' \| 'mono'` | detected | Force a color depth (useful in tests) |
| `nerdFont` | `boolean` | detected | Force the icon tier |
| `once` | `boolean` | `false` | Render a single frame, then resolve (no loop, no `process.exit`) |
| `onError` | `(err) => void \| 'continue'` | — | Frame-error boundary; return `'continue'` to keep the loop alive |
| `escTimeoutMs` / `holdWindowMs` | `number` | `30` / `150` | Input tokenizer tuning |
| `resizeDebounceMs` | `number` | `1` | Resize settle window |

## Crash safety

A crashing app must never leave the terminal broken. Bunti guarantees restoration (raw mode off, mouse off, alternate buffer exited, cursor shown) on **every** exit path:

- clean stop (`ctx.requestStop()`, SIGINT/SIGTERM)
- a throw inside the render callback — the loop tears down, restores the terminal, and **rejects the `render()` promise** with your error (catch it with `try { await render(…) }`, or pass `onError`)
- `uncaughtException` / `unhandledRejection` / `SIGHUP` / process exit — restore first; the error prints on the *main* screen

## Headless testing {#headless-testing}

Two recipes cover CI and agent-driven verification.

**Single frame, no TTY needed** — Bunti renders happily into a pipe:

```typescript
await bunti.render((ctx) => {
  ctx.box({ width: 20, border: 'rounded' }, (b) => b.text('snapshot me'));
}, { once: true });
// stdout now contains the full ANSI frame; the promise resolves, your script continues
```

**Buffer-level assertions** — drive the engine directly:

```typescript
import {
  createScreenState,
  createScreenContext,
  renderFrame,
} from '@zakmandhro/bunti';

const state = createScreenState({ colorTier: 'truecolor' });
const ctx = createScreenContext(state);
ctx.box({ x: 0, y: 0, width: 12, height: 3, border: 'rounded' }, (b) => b.text('hi'));
ctx.flushFlow();
const ansi = renderFrame(state); // the exact bytes a terminal would receive
```

Keyboard interaction needs a real PTY — see the macOS-safe recipe in [Input & Mouse](/input-and-mouse#the-pty-caveat).

## Performance

The full draw path (clear → gradient wallpaper → content → diff) measures **~0.4ms per full-screen frame at 120×40** on Apple Silicon — roughly 40× headroom inside the 16.7ms/60fps budget. The diff renderer tracks fg/bg and all five text attributes across cells and emits minimal SGR transitions.
