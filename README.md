# 🛰️ Bunti (Bun Terminal Interface)

**A minimalist, utility-first terminal layout engine built specifically for Bun.**

Bunti (pronounced *Bun-ty*) is a zero-dependency, high-performance library for building terminal user interfaces (TUIs) using a composable box model. Inspired by Go's Lipgloss, it focuses on pure string manipulation and leverages Bun's native DirectWriter for maximum throughput.

## ✨ Features

- 🏎️ **Bun-Native First**: Leverages `Bun.stdout.writer()` for 2.2x - 3.5x faster rendering than Node.js streams.
- 📦 **Zero Native Dependencies**: 100% pure TypeScript. No C++, Rust, or Zig binaries to compile or download.
- 📐 **Composable Box Model**: Define padding, borders, alignment, and widths using a simple, declarative API.
- 🌈 **ANSI-Aware**: Surgically precise truncation and width calculation that preserves your colors and styles.
- 🎨 **Theming**: Create reusable style functions to keep your cockpit layouts consistent.

## 🚀 Quick Start

```typescript
import { box, joinHorizontal, render, createStyle } from 'bunti';
import pc from 'picocolors';

// 1. Define a reusable style
const panel = createStyle({
  border: 'rounded',
  borderColor: pc.cyan,
  padding: [1, 2],
  width: 40
});

// 2. Compose your layout
const frame = joinHorizontal(
  panel(pc.blue('Telemetry\n') + 'CPU: 0.02%\nRAM: 1.2GB'),
  panel(pc.magenta('Active Missions\n') + '✓ Orbit\n⚠ Docking')
);

// 3. Render at hyper-speed
render(frame);
```

## 🏁 Performance

Bunti is designed for the age of agentic engineering. In benchmarks, it can render **100 complex frames in ~2.5ms** (~0.02ms per frame), making it one of the fastest TUI engines in the ecosystem.

## 📄 License

MIT © Zak Mandhro
