# 🛰️ Bunti (Bun Terminal Interface)

**A high-performance, functional TUI engine built specifically for Bun.**

Bunti (pronounced *Bun-ty*) is a zero-dependency, double-buffered layout engine for building terminal user interfaces. Unlike traditional TUI libraries, Bunti uses a **functional, state-driven architecture** and a **surgical diff-renderer** to deliver 60+ FPS layouts with minimal CPU and TTY overhead.

## ✨ Features

- 🏗️ **Contextual DSL**: Build complex UIs with a declarative, nested closure API. No manual blitting required for standard layouts.
- 🏎️ **Double-Buffered Diffing**: Only dirty cells are sent to the terminal. 10x - 50x less ANSI data than standard "full-frame" renderers.
- 📐 **Nerd-Native Box Model**: Native support for Nerd Fonts v3. Emojis are automatically swapped for high-fidelity Nerd Font icons to ensure perfect spacing stability.
- 🌈 **ANSI-Aware Layout**: Composable boxes, padding, and alignment that preserve styles and colors.
- 🖱️ **Interactive**: Built-in SGR mouse tracking and focus detection with automatic FPS throttling.

## 🚀 Quick Start

```typescript
import { bunti } from 'bunti';

bunti.render((b) => {
  // 1. Set a background
  b.wallpaper({ color: "midnight" });

  // 2. Define a layout using the contextual DSL.
  // The 🛰️ emoji is automatically swapped for Nerd Font equivalents.
  b.box({
    size: "auto",
    bgColor: "white",
    color: "blank",
    padding: [1, 4],
    border: 'rounded'
  }, (box) => {
    b.span({ color: b.color.cyan }, () => {
      b.text("🛰️ MISSION CONTROL\n");
    });
    b.text("STATUS: NOMINAL");
    b.icon("success");
  });
}, { fps: 60, mouse: true });
```

## 🏁 Performance

Bunti is designed for the age of agentic engineering. By diffing front/back buffers, it can maintain **60-120 FPS** even on complex layouts while keeping TTY bytes significantly lower than standard stream-based libraries.

## 📄 License

MIT © Zak Mandhro
