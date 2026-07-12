# Input & Mouse

Enable input in the render options:

```typescript
bunti.render(cb, { keyboard: true, mouse: true });
```

## Keyboard

The simple path is `ctx.lastKey` — the first unmodified key of the frame. Printable keys arrive as the literal character (`'a'`, `' '`), specials are normalized lowercase names (`'up'`, `'enter'`, `'escape'`, `'home'`, `'delete'`, `'pageup'`…), and mouse events arrive as `'click'`, `'wheel_up'`, `'wheel_down'`. The `KEYS` constant has them all.

For everything else there's the frame's full event list:

```typescript
for (const e of ctx.keys) {
  // e: { key, kind: 'press' | 'repeat' | 'release', ctrl, alt, shift, raw }
  if (e.key === 's' && e.ctrl) save();
}

if (ctx.keyPressed('enter')) submit();   // pressed or repeated this frame
if (ctx.isKeyHeld('right')) moveRight(); // true while the repeat stream lives
```

The tokenizer handles escape sequences split across stdin chunks, multiple events per chunk, ctrl/alt modifier combos, and bare-ESC disambiguation. Key `release` events are currently synthesized when a key's repeat stream expires (the held-key window, default 150ms, tunable via `holdWindowMs`).

## Mouse, clicks & hover

**A click fires exactly once, on button release, at the press origin** — no repeat-firing while held.

```typescript
const hit = ctx.hitbox('save-btn', { x: 2, y: 10, width: 12, height: 1 });
if (hit.hovered) {/* pointer cursor shows automatically */}
if (hit.clicked) save();       // one frame, one fire

// Or query by id anywhere in the frame:
ctx.isHovered('save-btn');
ctx.isClicked('save-btn');
ctx.isHoverEnter('save-btn');  // hover turned on this frame
ctx.isHoverLeave('save-btn');  // hover turned off this frame
```

Rules worth knowing:

- **Hitboxes share the painted rect.** Components register hitboxes exactly where their pixels land, including inside auto-sized, centered boxes and mid-flow (two buttons on one line get distinct rects).
- **Topmost wins.** When hitboxes overlap, only the last-registered one (visually on top) receives hover/click.
- **Pointer cursor** — when anything hoverable is under the mouse, Bunti emits the OSC 22 pointer-cursor sequence on supporting terminals (Ghostty, kitty, WezTerm). Web-style affordance, zero config.
- Built-ins do this for you: `Button`, `Link`, `Card` (pass an `id`), and `list()` rows are hoverable/clickable out of the box.

## The PTY caveat

Keyboard input requires a real TTY. Piped stdin is ignored (you'll get a dev hint on exit). For automated testing on macOS, use the shell-pipeline form — `script` rejects Bun's socketpair stdin:

```typescript
const proc = Bun.spawn(
  ['sh', '-c', `(sleep 2; printf q) | script -q /dev/null bun app.ts`],
  { stdout: 'pipe' },
);
await proc.exited; // exit 0 + rendered frames in stdout
```

Rendering itself works fine into plain pipes — see [Headless testing](/engine#headless-testing).
