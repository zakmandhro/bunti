# 🛰️ Bunti Icon Engine

**High-fidelity, zero-dependency icon orchestration with automatic fallback.**

Bunti features a surgical icon engine designed for the age of parallel engineering. It solves the "Jagged Border" problem by implementing **Elastic Padding**—automatically adjusting box layouts based on character width to ensure perfect alignment.

## 💎 The Two-Tier Fallback

Bunti automatically detects your terminal's capabilities and serves the best possible visual signal. Emojis have been dropped to ensure perfect spacing stability in complex layouts.

1.  **Nerd Font (Fidelity)**: High-resolution tactical icons (e.g., `󰡯`, ``). Treated as **width 1**.
2.  **ASCII (Minimalist)**: Surgical single-character fallbacks for legacy TTYs (e.g., `*`, `v`, `!`). Treated as **width 1**.

## 🚀 Usage

### 1. Opinionated Standards
Use the built-in `icon()` helper for the "Stable 50" set of tactical dev icons.

```typescript
import { bunti } from 'bunti';

await bunti.init(); // Required for capability detection

console.log(bunti.icon('satellite')); // 󰡯 (NF) or S (ASCII)
console.log(bunti.icon('branch'));    //  (NF) or * (ASCII)
```

### 2. Nerd Font Registry
Access any of the 50+ curated Nerd Font v3 icons by name.

```typescript
console.log(bunti.nerd('ts')); //  (TypeScript)
console.log(bunti.nerd('js')); //  (JavaScript)
```

### 3. Custom Registration
Add your own icons to the session registry.

```typescript
bunti.register('my-icon', '\uF006A');
console.log(bunti.nerd('my-icon'));
```

## 📐 Elastic Padding

Traditional TUI libraries often struggle with character alignment, causing borders to overflow or cave in.

**Bunti is different.** Our layout engine calculates the `visibleWidth` of every grapheme cluster. When you put an icon in a `box()`, Bunti automatically adjusts the internal padding to ensure the borders remain pixel-perfect and symmetrical across both tiers.

## 🎬 Technical Showcase

Run the full icon manifest to see the engine in action:

```bash
bun demo icons
```
