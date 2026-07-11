# 🥟 Bunti (Bun Terminal Interface)

**A Bun-native terminal layout engine with zero dependencies, 60fps rendering, and an agent-optimized functional API.**

Bunti (pronounced *Bun-ty*) is a zero-dependency, double-buffered layout engine for building terminal user interfaces. Unlike traditional TUI libraries, Bunti uses a **functional, state-driven architecture** and a **surgical diff-renderer** to deliver 60+ FPS layouts with minimal CPU and TTY overhead.

## ✨ Features

- 🏗️ **Contextual DSL**: Build complex UIs with a declarative, nested closure API.
- 🏎️ **Double-Buffered Diffing**: Only dirty row spans are sent to the terminal. Zero flicker.
- 📏 **Mathematically Absolute**: 100% precision in width, padding, and border alignment.
- 📐 **Tactical Standard**: Opinionated border styles (`default`, `rounded`, `frame`, `thick-frame`).
- 🌈 **24-bit TrueColor**: High-fidelity RGB gradients with native hex parsing and relative contrast.
- 🖱️ **Interactive**: Built-in SGR mouse tracking and focus detection with automatic FPS throttling.
- 🎞️ **Animation Helpers**: Timeline progress, color fades, flicker, and typewriter text with block cursors.

## 📦 Installation

Bunti is Bun-native and ships compiled ESM plus TypeScript declarations — with zero runtime dependencies.

```bash
bun add @zakmandhro/bunti
```

> Bunti requires the [Bun](https://bun.sh) runtime (>= 1.0). It uses Bun-native APIs for rendering, so Node.js is not supported.

## 🚀 Quick Start

```typescript
import { bunti } from '@zakmandhro/bunti';
import { Box, Button, Input } from '@zakmandhro/bunti/components';

bunti.render((ctx) => {
  const { color, icon, wallpaper, gradient } = ctx;

  wallpaper(gradient({ colors: ['midnight', 'plasma'] }));

  Box(ctx, {
    width: 48,
    border: 'frame',
    bgColor: 'white',
    color: 'black'
  }, (sub) => {
    const { text } = sub;
    text(` ${icon('rocket')} `);
    text(color.bold('MISSION CONTROL\n\n'));

    Input(sub, {
      id: 'mission',
      label: 'MISSION:',
      placeholder: 'Enter mission name...',
      width: 36
    });

    Button(sub, {
      id: 'deploy',
      label: 'Deploy',
      variant: 'primary'
    });
  });
}, { fps: 60, mouse: true, keyboard: true, defaultFg: 'silver' });
```

## 📏 Layout Model

Everything is a cell rect, and coordinates are **local to the current
context**: the whole screen at the root, the padded interior inside a
`box()`. A root-level `box()` paints directly into the screen buffer and
**centers itself** unless you pass `x`/`y`; a nested `box()` joins its
parent's text flow instead. Every drawing call also *returns* the rendered
string, so you can compose with `joinHorizontal`/`joinVertical` or place
output manually. Carve responsive layouts with tracks instead of column
math:

```typescript
const [sidebar, main] = ctx.split({
  direction: 'horizontal',
  constraints: [24, '1fr'], // cells, percentages, and fr fill units
});
ctx.box({ x: sidebar.x, y: 2, width: sidebar.width, border: 'rounded' }, drawNav);
```

Under the hood it is Rect-first:

- `Rect` is the geometry primitive.
- `Box`, `Button`, `Input`, `Card`, and `Header` resolve a rect before rendering.
- Hitboxes and rendered output share the same resolved rect.
- `splitRect()` and `ctx.split()` create responsive tracks from fixed sizes, percentages, and `fr` fill units.
- `ctx.resolveLocalRect()` places components within the current parent area, including left/center/right and top/center/bottom defaults.

A complete, runnable dashboard template lives at
[`examples/starter.ts`](./examples/starter.ts) — copy it as your app's
starting point.

## 📐 Border Archetypes

Bunti categorizes containers into three visual archetypes:

| Category | Styles | Description |
| :--- | :--- | :--- |
| **Wireframe** | `default`, `rounded`, `double`, `dashed`, `dotted` | Clean, 1-width lines. Zero visual mass. |
| **Frame** | `frame`, `thick-frame` | Block-based containers. High physical presence. |
| **Ghost** | `none` | Purely structural containers for grouping and alignment. |

## 🏁 Performance

Bunti is built for speed. By leveraging `Bun.stdout.writer()` and surgical diffing, it can maintain **60-120 FPS** on complex layouts while keeping TTY bytes significantly lower than standard stream-based libraries.

## 🤖 Agent & CI testing

Bunti renders fine to plain pipes — `bun app.ts | cat` produces real ANSI
frames, so screenshot-style assertions work anywhere. **Keyboard input is
different: it needs a real TTY.** When stdin is a pipe (CI, agent
harnesses, `echo q | bun app.ts`), raw-mode input is never attached and
keys are silently ignored — Bunti prints a dev hint to stderr on exit when
this happens (silence hints with `BUNTI_NO_HINTS=1`).

To drive keyboard input headlessly, wrap the run in a PTY. On macOS and
Linux, `script` is the zero-dependency way — mind the argument-order trap:

```bash
# macOS: the transcript file comes BEFORE the command.
(sleep 2; printf 'q') | script -q /dev/null bun app.ts

# Linux (util-linux script): the command is passed via -c.
(sleep 2; printf 'q') | script -qec "bun app.ts" /dev/null
```

Using the Linux syntax on macOS (`script -q bun app.ts`) does not run your
app — it clobbers a file literally named `bun` with the session transcript
and drops you into an interactive shell.

A copy-paste PTY smoke test (spawn, send a key, assert clean exit):

```typescript
// pty-test.ts — bun pty-test.ts
const proc = Bun.spawn(
  ['script', '-q', '/dev/null', 'bun', 'app.ts'], // macOS arg order
  { stdin: 'pipe', stdout: 'pipe', stderr: 'inherit' },
);
await Bun.sleep(2000);        // let it render a few frames
proc.stdin.write('q');        // your app's quit key
proc.stdin.end();
const code = await proc.exited;
const frames = await new Response(proc.stdout).text();
if (code !== 0 || !frames.includes('MISSION CONTROL')) process.exit(1);
console.log('PTY smoke test passed');
```

For pure rendering checks, skip the PTY entirely: `render(cb, { once:
true })` draws one frame and returns.

## 🎮 Demos

Run a public demo:

```bash
bun demo 2048
bun demo showcase
bun demo animation
bun demo interaction
bun demo dashboard
bun demo engine
bun demo login
```

Internal/debug demos are still available by name in the runner, but the public list favors fewer, richer examples.

## 🛠️ Tooling

### TypeScript
Bunti uses the standard TypeScript compiler for type checking so local development and GitHub Actions run the same toolchain.

Run a full check with: `bun run typecheck`

Build the published package with:

```bash
bun run build
npm pack --dry-run
```

## 📚 Documentation

Dive deeper into Bunti's architecture and layout engine at
[zakmandhro.github.io/bunti](https://zakmandhro.github.io/bunti/):

- [The Box Model & Layout Math](https://zakmandhro.github.io/bunti/layout.html)
- [Bunti Components & Primitives](https://zakmandhro.github.io/bunti/components.html)
- [Theming & Colors](https://zakmandhro.github.io/bunti/theming.html)
- [Animations & Canvas](https://zakmandhro.github.io/bunti/animations.html)
- [Engine & Utilities](https://zakmandhro.github.io/bunti/engine.html)
- [Bunti vs. The TUI Ecosystem](https://zakmandhro.github.io/bunti/comparison.html)

The package also ships [`AGENTS.md`](./AGENTS.md) (agent playbook) and
[`llms.txt`](./llms.txt) (compact API reference, generated from the JSDoc
by `bun scripts/gen-llms.ts`) — the full documented API lives in the
shipped `dist/*.d.ts`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Since Bunti prioritizes mathematical precision and performance, please ensure you run the benchmark and type-check scripts before submitting.

```bash
bun run lint
bun run typecheck
bun run test
bun run build
npm pack --dry-run
bun run bench
```

## 📄 License

MIT © Zak Mandhro
