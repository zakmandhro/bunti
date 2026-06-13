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

## 📦 Installation

Bunti is designed for Bun, but works in standard Node.js environments (v18+) as well.

```bash
bun add @zakmandhro/bunti
```

Or using npm/pnpm/yarn:

```bash
npm install @zakmandhro/bunti
```

## 🚀 Quick Start

```typescript
import { bunti } from '@zakmandhro/bunti';

bunti.render(({ wallpaper, box, color, icon, span }) => {
  // 1. Set a dynamic gradient background
  wallpaper(bunti.gradient({ colors: ['midnight', 'plasma'] }));

  // 2. Define a centered high-contrast card
  box({
    size: "auto",
    bgColor: "white",
    color: "blank", // Automatic high-contrast black
    border: 'frame' // Tactical block border
  }, ({ text }) => {
    text(` ${icon('rocket')} `);
    text(color.bold("MISSION CONTROL\n\n"));
    
    span({ color: color.dim }, ({ text }) => {
      text("STATUS: ");
    });
    text("NOMINAL");
  });
}, { fps: 60, mouse: true });
```

## 📐 Border Archetypes

Bunti categorizes containers into three visual archetypes:

| Category | Styles | Description |
| :--- | :--- | :--- |
| **Wireframe** | `default`, `rounded`, `double`, `dashed`, `dotted` | Clean, 1-width lines. Zero visual mass. |
| **Frame** | `frame`, `thick-frame` | Block-based containers. High physical presence. |
| **Ghost** | `none` | Purely structural containers for grouping and alignment. |

## 🏁 Performance

Bunti is built for speed. By leveraging `Bun.stdout.writer()` and surgical diffing, it can maintain **60-120 FPS** on complex layouts while keeping TTY bytes significantly lower than standard stream-based libraries.

## 🛠️ Tooling

### TypeScript
Bunti uses the standard TypeScript compiler for type checking so local development and GitHub Actions run the same toolchain.

Run a full check with: `bun run typecheck`

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
bun run bench
```

## 📄 License

MIT © Zak Mandhro
