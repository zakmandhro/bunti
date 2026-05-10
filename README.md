# 🛰️ Bunti (Bun Terminal Interface)

**A high-performance, functional TUI engine built specifically for Bun.**

Bunti (pronounced *Bun-ty*) is a zero-dependency, double-buffered layout engine for building terminal user interfaces. Unlike traditional TUI libraries, Bunti uses a **functional, state-driven architecture** and a **surgical diff-renderer** to deliver 60+ FPS layouts with minimal CPU and TTY overhead.

## ✨ Features

- 🏎️ **Double-Buffered Diffing**: Only dirty cells are sent to the terminal. 10x - 50x less ANSI data than standard "full-frame" renderers.
- 🏗️ **Strictly Functional**: No classes, no `this` context. Manage your entire UI state in a single, plain object.
- 📐 **Nerd-Native Box Model**: Native support for Nerd Fonts v3. Emojis are automatically swapped for high-fidelity Nerd Font icons to ensure perfect spacing stability.
- 🌈 **ANSI-Aware Layout**: Composable boxes, padding, and alignment that preserve styles and colors.
- 🖱️ **Interactive**: Built-in SGR mouse tracking and focus detection with automatic FPS throttling.

## 🚀 Quick Start

```typescript
import { bunti } from 'bunti';
import pc from 'picocolors';

// 1. Initialize your screen state
const state = bunti.createScreenState({ 
  mouse: true, 
  fps: 60 
});

// 2. Start the high-performance render loop
bunti.loop(state, (s) => {
  // Clear the back buffer for the next frame
  bunti.clearBackBuffer(s);

  // Define a layout using the box model.
  // Note: The 🛰️ emoji is automatically swapped for its Nerd Font equivalent.
  const ui = bunti.box(pc.cyan("🛰️  MISSION CONTROL\n") + "STATUS: NOMINAL", {
    border: 'rounded',
    padding: [1, 2],
    align: 'center'
  });

  // "Blit" the layout into the buffer at specific coordinates
  bunti.blit(s, 10, 5, ui);

  // Direct cell manipulation
  bunti.setCell(s, s.mouseX, s.mouseY, { char: '█', fg: 'magenta' });
});
```

## 🏁 Performance

Bunti is designed for the age of agentic engineering. By diffing front/back buffers, it can maintain **60-120 FPS** even on complex layouts while keeping TTY bytes significantly lower than standard stream-based libraries.

## 📄 License

MIT © Zak Mandhro
