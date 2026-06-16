# 🎞️ Animations & Canvas Tools

While Bunti is primarily a layout engine driven by `box()` constraints, it provides an underlying layer of timing utilities and direct memory-buffer access tools for creating rich, animated interfaces.

## ⏱️ Timing Utilities

Because Bunti runs a persistent `requestTick()` render loop (often at 60 FPS), you can query the layout engine to orchestrate time-based UI updates.

### `ctx.animate(duration, options)`

Returns a normalized float between `0.0` and `1.0` representing the progression of an animation over the given `duration` (in milliseconds).

```typescript
box({}, ({ text, animate }) => {
  // Returns 0 -> 1.0 over 2 seconds, then resets (loop)
  const progress = animate(2000, { loop: true });
  
  const width = Math.floor(progress * 20);
  text(`Loading: [${'#'.repeat(width).padEnd(20, ' ')}]`);
});
```

**Options:**
- `loop` (boolean): Restart from `0.0` when the duration is hit.
- `id` (string): Identifies the animation instance so the start time isn't reset on subsequent layout diffs.
- `delay` (number): Wait X ms before starting the progress counter.

### `ctx.fade(from, to, progress)`

Interpolates between two colors and returns an RGB tuple. It is useful for text, borders, backgrounds, and sequenced state transitions.

```typescript
bunti.render((ctx) => {
  const progress = ctx.animate(650, { id: "panel-fade" });
  const borderColor = ctx.fade("#0a0a0b", "mint", progress);

  ctx.box({ width: 40, border: "rounded", borderColor }, ({ text }) => {
    text(ctx.color.fg(ctx.fade("gray", "white", progress), "Fading in"));
  });
});
```

### `ctx.typewriter(text, options)`

Reveals text over time and returns a state object with a block cursor. The helper is grapheme-safe, so wide emoji and composed characters are not sliced in half.

```typescript
bunti.render((ctx) => {
  const line = ctx.typewriter("Bunti features terminal animations", {
    id: "intro-copy",
    cps: 28,
    delay: 800,
    cursor: "█",
  });

  ctx.text(ctx.color.fg("silver", line.text));
  ctx.text(ctx.color.fg("gold", line.cursor));
});
```

**Options:**
- `id` (string): Identifies the typewriter timeline.
- `cps` (number): Characters per second. Defaults to `24`.
- `delay` (number): Wait X ms before typing starts.
- `loop` (boolean): Restart after the full text has been revealed.
- `cursor` (string): Cursor glyph. Defaults to `█`.
- `blink` (boolean): Disable with `false`.
- `blinkRate` (number): Cursor blink interval in ms. Defaults to `450`.

### `ctx.flicker(intensity)`

Returns `true` or `false` randomly based on the `intensity` (0.0 to 1.0). Useful for simulating failing hardware or blinking UI elements in tactical dashboards.

```typescript
box({}, ({ text, flicker, color }) => {
  if (flicker(0.8)) {
    text(color.red.bold("WARNING: HULL INTEGRITY COMPROMISED"));
  } else {
    text(color.dim("WARNING: HULL INTEGRITY COMPROMISED"));
  }
});
```

---

## 🎨 Direct Canvas Access (Advanced)

If you need to break out of the flex/box layout constraints (e.g., drawing a graph, a map, or a raw particle simulation), Bunti provides primitives to write directly into the TTY Buffer grid.

> **Note:** These commands bypass layout wrapping and padding logic. They are positioned absolutely based on the terminal's root `(0, 0)` origin.

### `ctx.blit(x, y, content, style?)`

Writes a string (with optional styling) directly to the X/Y coordinates in the backbuffer. `blit` string contents can contain linebreaks (`\n`) to stamp multi-line ASCII art or graphs instantly.

```typescript
ctx.blit(10, 5, "DIRECT INJECTION", { fg: "cyan" });

const ship = [
  "   /\\   ",
  "  /  \\  ",
  " /____\\ "
].join('\n');

ctx.blit(0, 0, ship);
```

### `ctx.rect(x, y, width, height, style)`

Draws a solid filled rectangle block at absolute coordinates.

```typescript
ctx.rect(2, 2, 20, 10, {
  bg: "midnight",
  char: " ", // Solid fill
});
```
