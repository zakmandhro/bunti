# 🥟 Bunti Icon Engine

**High-fidelity, zero-dependency tactical iconography.**

Bunti features a surgical icon engine designed for the age of agentic engineering. It solves the "Jagged Border" problem by enforcing a **Width-1 Standard**—ensuring all tactical icons end up as perfectly aligned single-column units.

## 💎 Tactical Stability

Bunti assumes **Nerd Font v3** support by default for instant high-fidelity rendering. 

To ensure layout stability across all terminals, Bunti implements a **Nerd-Emoji Swap**: multi-byte emojis provided by the user are automatically transformed into their closest Width-1 Nerd Font equivalent *before* measurement or rendering.

1.  **Nerd Font (Default)**: High-resolution tactical symbols (e.g., `󰡯`, ``).
2.  **ASCII (Fallback)**: Surgical single-character fallbacks for legacy TTYs (e.g., `S`, `*`).

## 🚀 Usage

### 1. The `icon()` Helper
Use the built-in `icon()` helper for the "Stable 50" set of tactical dev icons.

```typescript
bunti.render(({ icon, text }) => {
  text(icon('rocket')); // 󰡯 (NF) or R (ASCII)
  text(icon('branch')); //  (NF) or * (ASCII)
});
```

### 2. Side-by-Side Comparison
Run the icon showcase to see the mapping in action:

```bash
bun demo icons
```

## 📐 Spacing Stability

Traditional TUI libraries often struggle with character alignment, causing borders to overflow or cave in when emojis are present.

**Bunti is different.** By mapping complex emojis to fixed-width tactical icons, Bunti guarantees that your layout math is always absolute. A 30-column box will **always** render at exactly 30 columns, regardless of the icons inside.
