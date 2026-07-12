# Building with Agents

Bunti is designed so that LLM coding agents write it correctly on the first try — not by shipping a giant cheat sheet, but by making the API itself teach.

## Why it works

- **The types are the documentation.** The published `.d.ts` files carry 550+ JSDoc blocks with inline examples — `elapsedTime` says it's milliseconds, `padding` says `[vertical, horizontal]`, `lastKey` explains its semantics. Agents read `node_modules`; Bunti makes that reading count.
- **`llms.txt` ships in the package**, generated from the real JSDoc by a script that fails the publish if docs drift. The mental-model block ("immediate mode, keyed state, layers for overlap") pre-empts the classic mistakes.
- **Dev hints that teach.** Misuse produces a buffered hint on stderr at exit — never mid-frame, so the UI is never corrupted:

  ```
  [bunti] dev hints (set BUNTI_NO_HINTS=1 to silence):
  - keyboard input read but { keyboard: true } not set in render options
  - unknown icon 'rockt' — did you mean 'rocket'?
  - keyboard requested but stdin is not a TTY (piped input is ignored)
  ```

  Silenced by `BUNTI_NO_HINTS=1` or `NODE_ENV=production`.
- **A typed icon library.** All 10,763 Nerd Font names are a literal union — a typo'd icon is a compile error with a "did you mean" suggestion, not a blank cell.

## The evidence

We continuously run *fresh-agent evals*: a clean agent session gets only the published npm package and a one-paragraph prompt.

- **Eval #1** — "build me a dashboard" → **one-shot success**: typechecked, rendered pixel-perfect, clean `q` quit. Zero code changes.
- **Eval #2** — a deliberately hard prompt (Dracula theme + full icon library + confirmation modal + animated progress + mouse + live theme switching) → **one-shot pass on all seven behavioral checkpoints**. The evaluator's summary:

  > "~90% of the feature matrix worked on the literal first run — the docs and API generated zero iterations."

  The two bugs that eval *did* find (silent mouse-geometry issues) were fixed in v0.2.1 — the eval loop is also our QA.

## The mental model to give your agent

If you're prompting an agent to build with Bunti, this is the whole cheat sheet (it's also in the package's `AGENTS.md`):

1. Render callback redraws the full frame from state, every tick — no component tree, no reconciler, no JSX.
2. State across frames: `ctx.useState('key', initial)`; input: `ctx.lastKey` / `ctx.keys`; quit: `ctx.requestStop()`.
3. Anything overlapping goes in `ctx.layer()` — draw order alone does not stack.
4. Style from `ctx.theme` tokens so live theme swaps keep working.
5. Animate from time (`ctx.animate`, `ctx.transition`), not frame counts.

## Starter template

[`examples/starter.ts`](https://github.com/zakmandhro/bunti/blob/main/examples/starter.ts) is the pit-of-success layout: header, panels, keyboard handling, themed throughout. Point your agent at it — or just say "build me a dashboard with @zakmandhro/bunti" and let the types do the talking.
