# 🎨 Colors & Theming

Bunti ships a semantic theme system on a 24-bit TrueColor engine. UIs are built
against **theme tokens** (`primary`, `surface`, `danger`, …) instead of
hardcoded colors, so an entire app can switch palettes live with one call —
and it degrades gracefully to 256-color, 16-color, or no-color terminals.

## 🧩 The Theme

Every render exposes `ctx.theme`, a complete set of semantic tokens:

| Token | Role |
| :--- | :--- |
| `background` | App base / wallpaper |
| `surface`, `surfaceRaised` | Panels and cards (one and two elevation steps) |
| `foreground`, `muted` | Primary and secondary text |
| `primary`, `onPrimary` | Brand color and the text that sits on it |
| `accent` | Secondary highlight |
| `border`, `focus`, `selection` | Chrome, focus rings, selected rows |
| `success`, `warning`, `danger`, `info` | Status colors |
| `gradients?` | Optional named gradient stop lists |

```typescript
interface Theme {
  name: string;
  mode: 'dark' | 'light';
  background: ThemeColor; surface: ThemeColor; surfaceRaised: ThemeColor;
  foreground: ThemeColor; muted: ThemeColor;
  primary: ThemeColor; onPrimary: ThemeColor; accent: ThemeColor;
  border: ThemeColor; focus: ThemeColor; selection: ThemeColor;
  success: ThemeColor; warning: ThemeColor; danger: ThemeColor; info: ThemeColor;
  gradients?: Record<string, (string | RGB)[]>;
}
```

### ThemeColor: callable *and* data

Each token is a `ThemeColor` — call it to fg-style text, or pass it anywhere a
color value is expected (`bgColor`, `borderColor`, `wallpaper`, gradient
stops, `selectedBg`). It carries `.rgb` and `.hex`:

```typescript
bunti.render((ctx) => {
  const t = ctx.theme;

  ctx.wallpaper(t.background);                     // as a color value
  ctx.box({
    border: 'rounded',
    borderColor: t.border,                         // as a border color
    bgColor: t.surface,                            // as a background
  }, (b) => {
    b.text(t.primary('Mission Control'));          // as a text styler
    b.text(t.muted(` luminance ${t.primary.hex}`)); // as data
  });
});
```

## 🏗️ createTheme: sparse in, coherent out

`createTheme(partial)` fills every missing token by derivation, so a theme
defined by two colors is still complete (this is what the VS Code theme
converter leans on):

```typescript
import { createTheme } from '@zakmandhro/bunti';

const catppuccin = createTheme({
  name: 'catppuccin-ish',
  background: '#1e1e2e',
  primary: '#89b4fa',
});
// mode, surface, foreground, onPrimary, border, ... all derived.
```

Derivation rules:

- **mode** — from background luminance when given, else `'dark'`.
- **surface / surfaceRaised** — background shifted 8% / 16% toward white
  (dark mode) or black (light mode).
- **foreground** — WCAG auto-contrast vs background, softened 8% toward it.
- **muted** — foreground mixed 45% toward background.
- **onPrimary** — pure black or white, whichever has more WCAG contrast vs
  `primary`.
- **accent** — primary shifted 25% toward white (dark) / black (light).
- **border** — foreground mixed 70% toward background.
- **focus** — primary. **selection** — primary mixed 70% toward background.
- **success/warning/danger/info** — PALETTE-derived defaults per mode.

Explicit tokens always win over derivation.

Two themes ship built in: `darkTheme` (midnight / silver / bunti-blue /
plasma) and `lightTheme`.

## 🔀 Live switching & subtree overrides

```typescript
import { bunti, darkTheme, lightTheme } from '@zakmandhro/bunti';

bunti.render((ctx) => {
  // ...render from ctx.theme...

  if (ctx.lastKey === '1') ctx.setTheme(darkTheme);   // swaps live + rerenders
  if (ctx.lastKey === '2') ctx.setTheme(lightTheme);

  // Override tokens for one subtree only:
  ctx.themed({ primary: '#ff0055' }, (sub) => {
    sub.box({ borderColor: sub.theme.primary }, (b) => b.text('spicy panel'));
  });
}, { theme: darkTheme }); // initial theme (defaults to darkTheme)
```

- `ctx.setTheme(themeOrPartial)` — replaces the active theme (partials are
  completed via `createTheme`) and requests a rerender.
- `ctx.themed(themeOrPartial, cb)` — runs `cb` with an overridden theme;
  partials overlay the *current* theme and the previous theme is restored
  afterwards. Overrides nest.

## 🌈 Supported Color Formats

Anywhere a color is expected, Bunti resolves:

| Format | Example | Description |
| :--- | :--- | :--- |
| **Named** | `"bunti-blue"` | Resolves from the internal palette. |
| **Hex** | `"#FF0055"` | Exact RGB. |
| **Hex + alpha** | `"#FF005580"`, `"#f058"` | Alpha is composited over black (or a base color via `hexToRGB(hex, base)`). VS Code themes use these heavily. |
| **ANSI 256** | `196` | Integer code, mapped through the exact xterm table. |
| **RGB tuple** | `{ r: 255, g: 0, b: 0 }` | Absolute definition. |
| **ThemeColor** | `ctx.theme.primary` | Semantic token. |

ANSI-256 codes convert to RGB via the exact xterm model (16 base colors +
6×6×6 cube + 24-step gray ramp) — `ansi256ToRGB(196)` is exactly `#ff0000` —
so `darken`/`lighten`/`fade`/gradients behave correctly on 256-color inputs.

## 🗂️ The Standard Palette

The opinionated `PALETTE` remains available for one-off colors:

```typescript
const PALETTE = {
  // Greyscale
  slate: '235', ash: '240', gray: '244', silver: '247', white: '255', black: '0',
  // Deep Blues & Space
  midnight: '17', ocean: '24', sky: '33', 'bunti-blue': '38', nebula: '61', plasma: '165',
  // Semantic
  success: '40', warning: '214', error: '196', info: '39',
  // Accents
  gold: '220', rose: '211', mint: '121',
};
```

## 📶 Color Capability Tiers

Bunti detects the terminal's color depth once (lazily) and quantizes every
color at the single resolution choke point — components and the renderer never
need to care:

| Tier | Trigger | Behavior |
| :--- | :--- | :--- |
| `truecolor` | `COLORTERM=truecolor/24bit`, known terminals, default | Full 24-bit output |
| `256` | `TERM=*-256color` | RGB quantized to nearest cube/gray-ramp code |
| `16` | legacy `TERM` (xterm, screen, vt100, …) | Quantized to the 16 base colors |
| `mono` | `NO_COLOR` set (per [no-color.org](https://no-color.org)), `TERM=dumb` | No color codes emitted at all |

```typescript
import { colorTier, setColorTier } from '@zakmandhro/bunti';

colorTier();                       // 'truecolor' | '256' | '16' | 'mono'
bunti.render(cb, { colorTier: '256' }); // force a tier (tests, screenshots)
```

## 🎯 Contextual High-Contrast Text (`"blank"`)

Pass `color: "blank"` on a box and Bunti picks pure black or pure white text
by the WCAG relative luminance of the box background (gradients sample their
middle stop):

```typescript
box({
  bgColor: ctx.theme.primary,
  color: 'blank', // auto-resolves to black or white for max contrast
}, ({ text }) => text('Always readable'));
```

The primitives are exported too: `relativeLuminance(color)` and
`contrastText(bgColor)`.

## 🌗 Relative Contrast Mathematics

`lighten()` / `darken()` on `ctx.color` still enable self-shading components:

```typescript
bunti.render(({ box, color, theme }) => {
  box({
    borderColor: theme.primary,
    bgColor: color.darken(theme.primary, 30),
  }, ({ text }) => {
    text(color.fg(color.lighten(theme.primary, 50), 'Highlighted Text'));
  });
});
```

## 🌊 Dynamic Gradients

Gradients accept any color format, including theme tokens:

```typescript
bunti.render(({ box, gradient, theme }) => {
  box({
    width: '100%',
    height: 10,
    bgColor: gradient({
      colors: [theme.background, theme.primary, theme.accent],
      direction: 'vertical',
      steps: 10,
    }),
  }, () => { /* ... */ });
});
```

## 🖋️ Default Foreground

Unstyled text can still be given a stable foreground independent of the theme
tokens:

```typescript
bunti.render((ctx) => {
  ctx.wallpaper(ctx.theme.background);
  ctx.text('Plain text uses silver.');
  ctx.text(ctx.color.fg('gold', ' Explicit colors still win.'));
}, {
  defaultFg: 'silver',
});
```
