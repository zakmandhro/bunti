# Terminal Support

Bunti detects the terminal it's running in and adapts — Nerd Font policy, color depth, and synchronized output are all decided per terminal, with clean overrides.

## The profile

```typescript
import { identifyTerminal } from '@zakmandhro/bunti';

const profile = identifyTerminal();
// { app: 'ghostty', version: '1.2.0', multiplexer: undefined,
//   truecolor: true, syncOutput: true, nerdFont: 'yes', source: 'env' }
```

Inside a render loop it's already on the context as `ctx.terminal`. Or from the CLI:

```bash
bunx @zakmandhro/bunti doctor
```

## Detection matrix

Identification is env-first: app-specific variables are the strongest evidence because only the real terminal sets them — and they survive tmux.

| Terminal | Signals | Nerd Font policy | Sync output |
| :--- | :--- | :--- | :--- |
| Ghostty | `GHOSTTY_RESOURCES_DIR`, `TERM_PROGRAM=ghostty` | **yes** — embeds a Symbols Nerd Font since 1.2 | ✓ |
| kitty | `KITTY_WINDOW_ID`, `TERM=xterm-kitty` | assumed-yes | ✓ |
| WezTerm | `WEZTERM_PANE`, `TERM_PROGRAM=WezTerm` | assumed-yes | ✓ |
| iTerm2 | `TERM_PROGRAM=iTerm.app`, `LC_TERMINAL=iTerm2` (survives ssh) | assumed-yes | ✓ |
| Alacritty | `ALACRITTY_WINDOW_ID`, `TERM=alacritty` | assumed-yes | ✓ |
| Warp | `TERM_PROGRAM=WarpTerminal` | assumed-yes | ✓ |
| VS Code | `TERM_PROGRAM=vscode` | assumed-no → ASCII fallbacks | ✗ |
| Apple Terminal | `TERM_PROGRAM=Apple_Terminal` | assumed-no → ASCII fallbacks | ✗ |
| unknown | — | assumed-no → ASCII fallbacks | kept on (harmless) |

tmux/screen are recorded as `multiplexer` without masking the inner identification.

**Why "assumed"?** A Nerd Font is a *font* the user installed — no escape sequence can prove it renders. Ghostty is the exception (it embeds one). Everything else is a per-terminal bet, and you hold the override:

```bash
BUNTI_NF=1 bun app.ts   # force Nerd Font glyphs (profile reports source: 'override')
BUNTI_NF=0 bun app.ts   # force ASCII fallbacks
```

## Color tiers

`colorTier()` resolves `truecolor | 256 | 16 | mono` from `COLORTERM`, `TERM`, and `NO_COLOR` (a non-empty `NO_COLOR` means mono, per [the spec](https://no-color.org)). `resolveColor()` quantizes every RGB value to the active tier — 24-bit themes degrade to the nearest xterm-256 or base-16 color automatically. Pin a tier for tests with `render(cb, { colorTier: '256' })`.

## What's deferred

Live escape-sequence probes (XTVERSION/DA2 handshakes) and a cached terminal profile are planned post-launch. Today's detection is synchronous, env-only, and conservative — unknown terminals get safe defaults and the overrides always win.
