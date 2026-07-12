# Box Model & Layout

Bunti features a zero-dependency, mathematically absolute layout engine designed specifically for terminal environments. It guarantees 100% precision in width, padding, and border alignment, preventing the "Jagged Border" artifacts common in traditional TUI libraries.

## The coordinate model

- `box()` without `x`/`y` joins the **flow** (stacks after previous content) and centers when it has no placement; with `x`/`y` it positions **relative to its parent context**.
- Inside a box callback, the sub-context's `offsetX`/`offsetY` convert local coordinates to absolute screen cells — and hitboxes always share the painted rect.
- `box()` both draws *and* returns its string (compose with `joinHorizontal`/`joinVertical`, or pass `detach: true` to render manually).
- Direct-draw primitives (`rect`, `blit`) take absolute coordinates; responsive tracks come from `ctx.split()`:

```typescript
const [sidebar, main] = ctx.split({ direction: 'horizontal', constraints: [30, '1fr'], gap: 2 });
ctx.box({ ...sidebar, border: 'rounded' }, drawSidebar);
ctx.box({ ...main, border: 'rounded' }, drawMain);
```

---

## 📐 Sizing & Constraints

*   **Zero-Default Ghost Boxes**: By default, `box()` applies no borders and no padding (`[0,0]`), collapsing tightly around its content to serve as invisible structural wrappers.
*   **Absolute Sizing**: Exact character column/row dimensions (e.g., `width: 30`, `height: 10`).
*   **Relative Sizing**: Percentage-based width relative to the parent container (e.g., `width: '90%'`).
*   **Flex Sizing**: Fluid layouts using fractional units (e.g., `width: '1fr'`).
*   **Clamped Constraints**: Support for `minWidth`, `maxWidth`, `minHeight`, and `maxHeight` to prevent layout collapse or overflow.

## 🧭 Multi-Axis Alignment & Positioning

*   **Anchored Positioning**: Snap top-level components to absolute terminal edges (`anchor: 'top'`, `anchor: 'bottom'`).
*   **Horizontal Alignment (`align`)**: Strict per-line formatting for `left`, `center`, and `right` text flow within constraints.
*   **Vertical Alignment (`valign`)**: Precise distribution of whitespace for `top`, `middle`, and `bottom` placement of content blocks (supports both single-line and multi-line content).
*   **Symmetrical Padding**: Predictable `[vertical, horizontal]` padding that integrates seamlessly with constraint math.

## 📝 Typography & Flow

*   **Surgical Wrapping**: Word-based text flow that automatically folds content at constraint boundaries to prevent TTY artifacts, with a fallback to character-breaking for over-width tokens.
*   **ANSI-Aware Truncation**: Safe `truncate(str, width)` utility that mathematically splices strings without corrupting embedded ANSI color codes or escape sequences.
*   **Deep-Integrated Nerd-Emoji Swap**: A global interceptor that safely swaps raw emojis (e.g., `🥟`, `🌀`) for Width-1 Nerd Font tactical signals (``, `󰁥`) *before* any layout math occurs, guaranteeing 100% border stability.

## 🧱 Structural Primitives

*   **Industrial Borders**: Opinionated, high-fidelity border sets (`default`, `rounded`, `double`, `dashed`, `dotted`, `frame`, `thick-frame`, `classic`).
*   **Side-Specific Colors**: Independent 24-bit color assignment for Top, Bottom, Left, and Right borders, enabling native UI depth and relative contrast shading.
*   **Tabular Data (`table()`)**: Rigid, perfectly aligned column-first grid structures with shared gutters and explicit column widths/alignments.

## 🎨 Visual Depth

*   **24-Bit TrueColor**: Full RGB hex support integrated directly into the `fg` and `bg` rendering pipeline.
*   **Dynamic Gradients**: Multi-stop interpolation (`midnight` -> `bunti-blue` -> `ocean`) capable of painting horizontally or vertically across structural nodes.
*   **Relative Contrast**: Built-in `lighten()` and `darken()` mathematics to automatically calculate border shades relative to background fills.
