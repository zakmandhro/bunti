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

### `Card(ctx, props, callback)`
A structural panel that integrates a styled top header/title with a content body. Automatically applies standard padding and contrast logic.

```typescript
import { Card } from 'bunti/components';

bunti.render((ctx) => {
  Card(ctx, { 
    title: "SYSTEM STATUS", 
    theme: "accent",
    width: 60 
  }, (sub) => {
    sub.text("All systems nominal.");
  });
});
```

### `Button(ctx, props)`
A highly interactive, focusable button element. It responds to `TAB` navigation, hover states (if mouse is enabled), and executes `onClick` when activated via `ENTER` or `CLICK`.

```typescript
import { Button } from 'bunti/components';

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

### `Input(ctx, props)`
A fully-featured single-line text input field. It handles internal cursor tracking, backspace/delete, horizontal scrolling for long text, and focus states.

```typescript
import { Input } from 'bunti/components';

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
import { Header } from 'bunti/components';

bunti.render((ctx) => {
  Header(ctx, {
    title: "MISSION CONTROL",
    subtitle: "v1.0.0",
    status: "ONLINE"
  });
});
```

---
**Note:** Because Bunti is purely functional, creating your own reusable components is as simple as writing a function that accepts `ctx` (and any props) and calls `ctx.box()` or `ctx.text()`. There is no React boilerplate or context providers required!
