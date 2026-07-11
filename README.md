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

Bunti's public layout direction is Rect-first:

- `Rect` is the geometry primitive.
- `Box`, `Button`, `Input`, `Card`, and `Header` resolve a rect before rendering.
- Hitboxes and rendered output share the same resolved rect.
- `splitRect()` and `ctx.split()` create responsive tracks from fixed sizes, percentages, and `fr` fill units.
- `ctx.resolveLocalRect()` places components within the current parent area, including left/center/right and top/center/bottom defaults.

## 📐 Border Archetypes

Bunti categorizes containers into three visual archetypes:

| Category | Styles | Description |
| :--- | :--- | :--- |
| **Wireframe** | `default`, `rounded`, `double`, `dashed`, `dotted` | Clean, 1-width lines. Zero visual mass. |
| **Frame** | `frame`, `thick-frame` | Block-based containers. High physical presence. |
| **Ghost** | `none` | Purely structural containers for grouping and alignment. |

## 🏁 Performance

Bunti is built for speed. By leveraging `Bun.stdout.writer()` and surgical diffing, it can maintain **60-120 FPS** on complex layouts while keeping TTY bytes significantly lower than standard stream-based libraries.

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

Dive deeper into Bunti's architecture and layout engine:

- [The Box Model & Layout Math](./docs/layout.md)
- [Bunti Components & Primitives](./docs/components.md)
- [Bunti vs. The TUI Ecosystem](./docs/comparison.md)

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
