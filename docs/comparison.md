# 🥟 Bunti vs. The TUI Ecosystem

Bunti is a high-performance, functional TUI engine built for the age of Bun. This document outlines how it compares to established standards in other languages and why it represents a new "Surgical" standard for terminal development.

## 🏁 Comparison Matrix

| Feature | **Bunti** (Bun) | **Ink** (TS/Node) | **Ratatui** (Rust) | **Lipgloss** (Go) |
| :--- | :--- | :--- | :--- | :--- |
| **Paradigm** | Functional DSL | React (JSX) | Immediate Mode | Utility-First |
| **API Style** | Scoped Closures | Hooks/JSX | Builder Pattern | Fluent Strings |
| **Rendering** | Double-Buffered Diff | Virtual DOM | Double-Buffered Diff | Full-Frame Swap |
| **Performance** | 60-120 FPS | 30-60 FPS | 120+ FPS | 60 FPS |
| **Width-Aware** | Yes (Native) | Yes | Yes | Yes |
| **Dependencies** | Zero | High (React) | Low | Low |

---

## 🏗️ Architectural Advantages

### 1. The Scoped Closure Pattern
Unlike **Ink**, which brings the heavy overhead of the React reconciler to the terminal, Bunti uses **Scoped Closures with Contextual Capabilities**. This gives you the same "declarative" feel but runs on a lightweight functional core. There is no Virtual DOM—only a surgical diff between two memory buffers.

### 2. Double-Buffered Diffing
Inspired by **Ratatui** and **Notcurses**, Bunti maintains a Front and Back buffer. Instead of redrawing the whole screen (which causes flickering), Bunti calculates the "damage" and only sends the changed cells to the terminal. This is critical for high-fidelity animations and low-latency SSH sessions.

### 3. Bun-Native DirectWriter
Bunti leverages `Bun.stdout.writer()` to bypass the traditional Node.js stream overhead. Combined with our diffing engine, Bunti achieves extreme throughput with near-zero CPU usage.

### 4. Emoji & Nerd Font Correctness
Bunti treats character width as a first-class citizen using `Bun.stringWidth`. It automatically handles the "Jagged Border" problem by tracking wide-character placeholders in the buffer, ensuring your layouts never cave in.

## 🎯 The Bunti Philosophy
Bunti is designed for **Surgical Engineering**. We prioritize:
- **Zero Bloat**: Small, functional traits instead of heavy classes.
- **High Signal**: Scoped APIs that provide only what you need.
- **Fidelity**: 60FPS visuals with perfect Unicode alignment.
