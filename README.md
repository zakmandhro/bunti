# 🛰️ Bunti (Bun Terminal Interface)

**A high-performance, functional TUI engine built specifically for Bun.**

Bunti (pronounced *Bun-ty*) is a zero-dependency, double-buffered layout engine for building terminal user interfaces. Unlike traditional TUI libraries, Bunti uses a **functional, state-driven architecture** and a **surgical diff-renderer** to deliver 60+ FPS layouts with minimal CPU and TTY overhead.

## ✨ Features

- 🏗️ **Contextual DSL**: Build complex UIs with a declarative, nested closure API.
- 🏎️ **Double-Buffered Diffing**: Only dirty row spans are sent to the terminal. Zero flicker.
- 📏 **Mathematically Absolute**: 100% precision in width, padding, and border alignment.
- 📐 **Tactical Standard**: Opinionated border styles (`default`, `rounded`, `frame`, `thick-frame`).
- 🌈 **24-bit TrueColor**: High-fidelity RGB gradients with native hex parsing and relative contrast.
- 🖱️ **Interactive**: Built-in SGR mouse tracking and focus detection with automatic FPS throttling.

## 🚀 Quick Start

```typescript
import { bunti } from 'bunti';

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

### TSGO (High-Performance TypeScript)
Bunti uses **[tsgo](https://github.com/d-ts/tsgo)** for its type-checking pipeline. 

We chose `tsgo` over the standard `tsc` because:
- **Speed**: It leverages a Go-based core to provide near-instant feedback during development.
- **Agent-Friendly**: Its predictable and high-performance output makes it ideal for automated engineering workflows.
- **Strict Integrity**: It ensures that Bunti's functional architecture remains 100% type-safe without the overhead of standard Node-based compilers.

Run a full check with: `npm run type-check`

## 📄 License

MIT © Zak Mandhro
