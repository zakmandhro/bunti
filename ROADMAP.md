# 🛰️ Bunti (Bun Terminal Interface) Roadmap

This roadmap defines the minimum surgical feature set required to power the **Space Station Mission Control** dashboard.

## 🏁 Phase 1: Core Engine Finesse (Required for SS)

1.  **[ ] Width-Aware Truncation**
    -   `truncate(str, length)`: Truncates based on visible width while preserving ANSI codes.
2.  **[ ] List Component**
    -   `list(items, options)`: Renders a vertical list with consistent indentation and optional focus highlighting.
3.  **[ ] Max-Width Container**
    -   `box()` enhancement to support `maxWidth` (percentage of terminal or fixed chars).
4.  **[ ] Inline Styles & Badges**
    -   `badge(text, colorFn)`: High-signal inline labels.
5.  **[ ] Tabular Layout**
    -   `table(rows, options)`: Grid-based layout for column-heavy data (Issues/PRs).

## 🚀 Phase 2: Open Source Release (Tomorrow)

1.  **[ ] README.md**: "Show, don't tell" documentation.
2.  **[ ] Multi-Line Alignment**: Top/Middle/Bottom alignment for `joinHorizontal`.
3.  **[ ] Stylesheet Support**: Reusable style objects (Lipgloss-like).
4.  **[ ] DirectWriter Performance Benchmarks**.

## 🛸 Phase 3: Post-Launch

1.  **[ ] Mouse Support**.
2.  **[ ] Interactive Inputs** (Select, Text).
3.  **[ ] Animation Timeline API**.
