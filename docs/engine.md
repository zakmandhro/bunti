# ⚙️ The Core Engine & Lifecycle

Bunti's rendering lifecycle is managed by a high-performance, double-buffered diffing loop. This document covers the configuration options for initializing the engine, as well as the low-level utilities exposed for text manipulation and icons.

## `bunti.render(callback, options)`

To start a Bunti application, you invoke the `render` function. It takes your UI declaration (the DSL closure) and a set of structural options.

```typescript
import { bunti } from 'bunti';

bunti.render((ctx) => {
  // Your layout here
}, {
  fps: 60,
  alternateBuffer: true,
  hideCursor: true,
  keyboard: true,
  mouse: true
});
```

### Render Options (`ScreenOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`fps`** | `number` | `60` | The target frames per second for the event loop. If focus is lost, Bunti automatically throttles to `5` FPS to save CPU. |
| **`alternateBuffer`** | `boolean` | `false` | When true, switches to the terminal's alternate screen buffer. This ensures that when the app exits, the user's previous terminal history is restored perfectly (like `vim` or `nano`). |
| **`hideCursor`** | `boolean` | `false` | Sends ANSI sequences to hide the blinking TTY cursor during operation. |
| **`keyboard`** | `boolean` | `false` | Enables `raw` mode on `stdin` to capture individual keystrokes (required for `Input`, `Button`, or `list` interaction). |
| **`mouse`** | `boolean` | `false` | Enables SGR Mouse tracking for click and hover events. |
| **`focus`** | `boolean` | `false` | Requests the terminal to report Focus In/Out events. |

---

## 🔤 Utilities & Text Mathematics

Building a TUI requires strict mathematical understanding of string widths, as ANSI color codes and emojis disrupt standard `string.length` calculations. Bunti exposes its internal utilities for you to use.

### `bunti.visibleWidth(str)`
Calculates the exact visible character width of a string in the terminal, ignoring hidden ANSI color codes and handling wide graphemes.

```typescript
const w = bunti.visibleWidth("\x1b[31mHello 🥟\x1b[0m"); // Returns 8
```

### `bunti.truncate(str, length, tail = '…')`
Truncates a string to an exact visible width while safely preserving and re-applying ANSI color codes. **Crucial** for preventing layout overflow.

```typescript
const safe = bunti.truncate(color.red("Danger: Core meltdown imminent!"), 15);
// Result visually fits in 15 cols, and keeps the text red.
```

### `bunti.stripAnsi(str)`
Strips all ANSI escape sequences from a string, returning pure text.

---

## 🎭 Typography & Icons

Bunti includes a centralized tactical icon map and an automatic emoji-replacement engine. This ensures layouts do not break when rendered in different terminal emulators with varying emoji width support.

### The Nerd-Emoji Swapper
By default, Bunti safely intercepts known emojis in your `text()` streams and swaps them for width-1 Nerd Font icons *before* layout math is calculated.

```typescript
box({}, ({ text }) => {
  text("Status: 🥟 Launching"); 
  // Internally translates to "Status:  Launching" keeping width math 100% stable.
});
```

### `bunti.icon(name)`
You can directly retrieve Nerd Font codes from the registry using standard semantic names.

```typescript
text(` ${bunti.icon('rocket')} BOOSTER IGNITION`);
```

*Common Icons:* `rocket`, `play`, `pause`, `stop`, `info`, `warning`, `error`, `success`, `cpu`, `ram`.
