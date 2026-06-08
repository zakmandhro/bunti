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
