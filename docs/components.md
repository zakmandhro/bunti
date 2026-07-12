# 🥟 Bunti Components & Primitives

Bunti provides a strictly functional, closure-based DSL for declaring UI structures. Instead of importing heavy class instances or using a Virtual DOM, you use lightweight functions attached to the `BuntiContext`.

This document covers both the **Core Primitives** (built into the context) and the **Higher-Order Components** (reusable tactical components).

---

## 🧱 Core Primitives (DSL)

These primitives are available directly on the context (`ctx`) when using `bunti.render((ctx) => { ... })`.

### `box(options, callback)`
The foundational structural element of Bunti. Boxes can have exact dimensions, responsive flex constraints, borders, and multi-axis alignment.

```typescript
box({
  width: "50%",
  padding: [1, 2], // [vertical, horizontal]
  border: "frame",
  borderColor: "cyan",
  align: "center",
  valign: "middle"
}, ({ text }) => {
  text("Inside the box!");
});
```

### `span(options, callback)`
Used to apply styling to an inline segment of text without breaking the layout flow.

```typescript
span({ color: color.red }, ({ text }) => {
  text("This text is dangerous.");
});
```

### `text(string)`
Writes plain text or ANSI strings into the current flow context. Automatically wraps according to the nearest parent `box` constraints.

```typescript
text("Hello ");
text(color.bold("World!"));
```

### `list(id, items, options)`
Renders a vertical list. If an `id` is provided and `interactive` is true, the list will automatically handle `UP`/`DOWN` keyboard navigation if the list gains focus.

```typescript
list("main_menu", ["Launch", "Settings", "Quit"], {
  bullet: "❯ ",
  activeColor: "cyan",
  interactive: true
});
```

### `table(rows, options)`
A strict column-first tabular layout. It calculates shared gutters and guarantees precise alignment of multi-column data.

```typescript
table([
  ["CPU", "34%", "NOMINAL"],
  ["RAM", "1.2GB", "NOMINAL"],
  ["NET", "0kbps", color.red("OFFLINE")]
], {
  widths: [10, 10, "1fr"],
  alignments: ["left", "right", "right"]
});
```

### `wallpaper(color | gradient)`
Fills the root terminal background buffer. Can accept solid hex colors, named palette colors, or dynamic gradients.

```typescript
wallpaper(ctx.gradient({ colors: ['midnight', 'black'] }));
```

---

## 🏗️ Higher-Order Components

For rapid prototyping, Bunti ships with several higher-order tactical components inside `src/components`. These are pure functions that wrap the core primitives.

To use them, import them from `bunti/components` (or `src/components`) and pass the current `ctx` as the first argument.

All components style themselves from `ctx.theme` tokens — swap the theme and they restyle live.

### `Card(ctx, props, callback)`
A structural panel that integrates a styled top header/title with a content body. Pass an `id` to make it hoverable (border lifts to the focus color under the mouse).

```typescript
import { Card } from '@zakmandhro/bunti/components';

bunti.render((ctx) => {
  Card(ctx, {
    title: "SYSTEM STATUS",
    variant: "accent",     // 'default' | 'accent' | 'danger'
    id: "status-card",     // optional: enables hover
    width: 60
  }, (sub) => {
    sub.text("All systems nominal.");
  });
});
```

### `Button(ctx, props)`
A highly interactive, focusable button element. It responds to `TAB` navigation, hover states (if mouse is enabled), and executes `onClick` when activated via `ENTER` or `CLICK`.

```typescript
import { Button } from '@zakmandhro/bunti/components';

bunti.render((ctx) => {
  Button(ctx, {
    id: "launch_btn",
    label: "LAUNCH SEQUENCE",
    icon: "rocket",
    variant: "primary",
    onClick: () => {
      // Execute launch sequence
    }
  });
});
```

Variants differ in height: `default` is a 3-row outlined box; `primary`, `ghost`, and `danger` are 1-row pills. `onClick` fires exactly once per click (on mouse release) or on <kbd>enter</kbd>/<kbd>space</kbd> when focused.

### `Input(ctx, props)`
A single-line text input with real cursor editing: insert-at-cursor, arrow/home/end movement (plus readline-style <kbd>ctrl+a</kbd>/<kbd>ctrl+e</kbd>), grapheme-aware emoji handling, and a horizontal scroll window that keeps the cursor visible in narrow fields.

```typescript
import { Input } from '@zakmandhro/bunti/components';

bunti.render((ctx) => {
  Input(ctx, {
    id: "command_input",
    label: "OVERRIDE CODE:",
    width: 40,
    placeholder: "Enter code...",
    onChange: (val) => {
      // Handle input change
    }
  });
});
```

### `Header(ctx, props)`
A full-width top-level navigation bar designed to anchor to the top of the terminal.

```typescript
import { Header } from '@zakmandhro/bunti/components';

bunti.render((ctx) => {
  Header(ctx, {
    title: "MISSION CONTROL",
    subtitle: "v1.0.0",
    status: "ONLINE"
  });
});
```

### `Modal(ctx, props, callback)`
A dialog rendered on its own layer with web-grade depth: a dimmed backdrop (default `0.55`), a drop shadow, and a 150ms slide/fade entrance — all overridable.

```typescript
import { Modal } from '@zakmandhro/bunti/components';

if (confirming) {
  Modal(ctx, { width: 40, height: 8, title: ' Confirm ' }, (m) => {
    m.text('Delete 3 files?\n\n');
    Button(m, { id: 'yes', label: 'Delete', variant: 'danger', onClick: doDelete });
    m.text('\n');
    Button(m, { id: 'no', label: 'Cancel', onClick: close });
  });
}
```

### `Spinner(ctx, props)`
A braille-frame activity indicator driven by elapsed time.

```typescript
Spinner(ctx, { x: 2, y: 1, label: 'fleet live' });
```

### `Progress(ctx, props)`
A themed progress bar; supports gradients across the fill.

```typescript
Progress(ctx, { x: 2, y: 3, width: 30, value: 0.72, showPercent: true });
```

### `Link(ctx, props)`
Underlined, hoverable, clickable text — the pointer cursor appears on supporting terminals.

```typescript
Link(ctx, { id: 'forgot', label: 'Forgot password?', x: 4, y: 12, onClick: showReset });
```

---
**Note:** Because Bunti is purely functional, creating your own reusable components is as simple as writing a function that accepts `ctx` (and any props) and calls `ctx.box()` or `ctx.text()`. There is no React boilerplate or context providers required!
