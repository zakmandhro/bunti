# 🛰️ Bunti (Bun Terminal Interface) Roadmap

This roadmap defines the surgical feature set required to power the **Space Station Mission Control** dashboard.

## ✅ Phase 1: Core Engine Finesse (Complete)

1.  **[x] Width-Aware Truncation**
    -   `truncate(str, length)`: ANSI-safe and grapheme-aware.
2.  **[x] Responsive Layouts**
    -   `minWidth`, `maxWidth`, and `wrap: true` integrated into the core box model.
3.  **[x] Double-Buffered Engine**
    -   High-performance surgical span diffing.
4.  **[x] 24-bit TrueColor**
    -   Native hex parsing and smooth RGB gradients.
5.  **[x] Contextual DSL**
    -   Functional, trait-based scoped closure API.
6.  **[x] Tactical Iconography**
    -   Nerd-Emoji Swap for 100% spacing stability.

## 🏁 Phase 2: Open Source Release (Next)

1.  **[ ] Tabular Layout**
    -   `table(rows, options)`: Grid-based layout for column-heavy data (Issues/PRs).
2.  **[ ] Reusable Components**
    -   `Card` and `Button` higher-order components.
3.  **[ ] Multi-Line Alignment**
    -   Refining `joinHorizontal` for top/middle/bottom alignment.
4.  **[ ] DirectWriter Performance Benchmarks**.

## 🛸 Phase 3: Post-Launch

1.  **[ ] Mouse Support** (Events API).
2.  **[ ] Interactive Inputs** (Select, Text).
3.  **[ ] Animation Timeline API**.
