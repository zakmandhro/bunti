# 🎨 Colors & Theming

Bunti provides a high-fidelity, 24-bit TrueColor rendering engine built around mathematical relative contrast and RGB interpolation. It bypasses legacy 16-color limits to provide web-like design capabilities in the terminal.

## 🗂️ The Standard Palette

Bunti ships with an opinionated `PALETTE` out of the box, optimized for dark terminal themes and high-contrast UI design.

You can use these semantic names anywhere a color is expected (e.g., `borderColor: "bunti-blue"`, `color.fg("mint", "Hello")`).

```typescript
const PALETTE = {
  // Greyscale
  slate: '235', ash: '240', gray: '244', silver: '247', white: '255', black: '0',
  // Deep Blues & Space
  midnight: '17', ocean: '24', sky: '33', 'bunti-blue': '38', plasma: '165',
  // Semantic
  success: '40', warning: '214', error: '196', info: '39',
  // Accents
  gold: '220', rose: '211', mint: '121', cyan: '51'
};
```

## 🌈 Supported Color Formats

When styling boxes, text, or spans, Bunti seamlessly resolves various color formats into raw ANSI sequences:

| Format | Example | Description |
| :--- | :--- | :--- |
| **Named** | `"bunti-blue"` | Resolves from the internal palette. |
| **Hex** | `"#FF0055"` | Parsed dynamically to an exact RGB tuple. |
| **ANSI 256** | `196` | Integer-based lookup (0-255). |
| **RGB Tuple**| `{ r: 255, g: 0, b: 0 }` | Absolute definition. |

```typescript
box({ borderColor: "#00FFCC", bgColor: "midnight" }, ({ text }) => { ... })
```

## 🌗 Relative Contrast Mathematics

Instead of hardcoding hover states or border depths, Bunti exposes `lighten()` and `darken()` mathematical functions attached to the `color` context. This allows you to build deeply contextual, self-shading components.

```typescript
import { bunti } from '@zakmandhro/bunti';

bunti.render(({ box, color }) => {
  const baseColor = "#3B82F6";
  
  box({
    borderColor: baseColor,
    bgColor: color.darken(baseColor, 30) // Automatically shades the background 30% darker
  }, ({ text }) => {
    text(color.fg(color.lighten(baseColor, 50), "Highlighted Text"));
  });
});
```

## 🌊 Dynamic Gradients

Bunti calculates smooth, multi-stop RGB interpolation across terminal blocks. Gradients can be applied to `wallpaper`, `bgColor`, or dynamically text via `ctx.gradient()`.

```typescript
bunti.render(({ box, gradient }) => {
  box({
    width: "100%",
    height: 10,
    bgColor: gradient({
      colors: ["midnight", "bunti-blue", "cyan"],
      direction: "vertical",
      steps: 10
    })
  }, () => { ... });
});
```

## 🎯 Contextual High-Contrast Text (`"blank"`)

A unique feature of Bunti's semantic engine is the `"blank"` color shortcut. When rendering text over a dynamic background (like a gradient), you can pass `"blank"`, and Bunti will automatically calculate whether to use Pure White or Solid Black to ensure maximum contrast accessibility.

```typescript
box({
  bgColor: "white",
  color: "blank" // Will automatically resolve to black text
}, ({ text }) => text("Visible!"));
```
