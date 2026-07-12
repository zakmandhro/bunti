# Bunti vs the Ecosystem

An honest comparison — every library below is good software with different priorities.

| | **Bunti** | **Ink** | **blessed / neo-blessed** |
| :--- | :--- | :--- | :--- |
| Runtime | Bun only | Node (+Bun) | Node |
| Paradigm | Immediate-mode functional DSL | React (JSX, reconciler, hooks) | Retained widget tree |
| Runtime dependencies | **0** | React + transitive tree | 0 (single large lib) |
| Rendering | Double-buffered cell diff, dirty spans only | Element re-render → output diff | Manual screen damage |
| Theming | Semantic tokens, live swap, VS Code presets | Bring your own | Style objects |
| Icons | 10,763 Nerd Font glyphs by name, typed | Bring your own | Bring your own |
| Mouse | Hitboxes, hover, pointer cursor, click-on-release | Community addons | Built-in (dated protocols) |
| Motion | Transitions, stagger, 14 easings, `dt` | Bring your own | Bring your own |
| Crash safety | Guaranteed terminal restore on any exit path | Partial | Partial |
| Agent ergonomics | JSDoc'd types, `llms.txt`, dev hints, eval-tested | React knowledge transfers | Sparse types |

## The one-line positioning

**Ink needs React and Node; Bunti is Bun-native, zero-dependency, and built for coding agents.**

If your team thinks in React and ships to Node, Ink is a fine choice with a large ecosystem. Bunti trades that familiarity for a smaller mental model (a render function and a context — no reconciler), a faster pipeline, and batteries included: themes, icons, mouse, and motion out of the box.

## Also worth knowing

- **OpenTUI** and other Bun-adjacent TUI projects are emerging in the same space — healthy competition; evaluate them for your use case.
- **Ratatui** (Rust) and **Bubble Tea** (Go) are excellent outside the JS/TS world; Bunti's buffer model takes inspiration from Ratatui's approach.
