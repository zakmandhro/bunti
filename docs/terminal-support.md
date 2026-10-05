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
| JetBrains IDEs | `TERMINAL_EMULATOR=JetBrains-JediTerm` | assumed-no → ASCII fallbacks | ✗ |
| mintty (Git Bash) | `TERM_PROGRAM=mintty` | assumed-no → ASCII fallbacks | ✗ |
| ConEmu / Cmder | `ConEmuANSI=ON`, `ConEmuPID` (version from `ConEmuBuild`) | assumed-no → ASCII fallbacks | ✗ |
| Windows Terminal | `WT_SESSION`; on Windows 11, also assumed when no signal is set | assumed-no → ASCII fallbacks | ✗ |
| Windows console (conhost) | Windows 10 with no signal and no `TERM` | assumed-no → ASCII fallbacks | ✗ |
| unknown | — | assumed-no → ASCII fallbacks | kept on (harmless) |

tmux/screen are recorded as `multiplexer` without masking the inner identification (psmux on Windows sets `TMUX` too).

### Windows

Windows Terminal sets `WT_SESSION` but no `TERM`, `TERM_PROGRAM`, or `COLORTERM` — and when it takes over as the default console (the stock setup since Windows 11 22H2) it sets nothing at all ([microsoft/terminal#13006](https://github.com/microsoft/terminal/issues/13006)). So on Windows with no signal, Bunti assumes Windows Terminal on Windows 11 and conhost on Windows 10. `WT_SESSION` is checked after `TERM_PROGRAM` apps because it leaks into terminals launched from a Windows Terminal tab (e.g. VS Code). Inside WSL the Unix rules apply; Windows Terminal forwards `WT_SESSION` there.

Windows Terminal ships no Nerd Font — its built-in glyphs cover box drawing and Powerline only — and synchronized output (1.24+) can't be version-gated from env, so both stay off.

**Why "assumed"?** A Nerd Font is a *font* the user installed — no escape sequence can prove it renders. Ghostty is the exception (it embeds one). Everything else is a per-terminal bet, and you hold the override:

```bash
BUNTI_NF=1 bun app.ts   # force Nerd Font glyphs (profile reports source: 'override')
BUNTI_NF=0 bun app.ts   # force ASCII fallbacks
```

## Color tiers

`colorTier()` resolves `truecolor | 256 | 16 | mono` from `COLORTERM`, `TERM`, and `NO_COLOR` (a non-empty `NO_COLOR` means mono, per [the spec](https://no-color.org)). A Windows console with no `TERM` falls back to the Windows build, like Node's `getColorDepth()`: 14931+ truecolor, 10586+ 256, else 16. `resolveColor()` quantizes every RGB value to the active tier — 24-bit themes degrade to the nearest xterm-256 or base-16 color automatically. Pin a tier for tests with `render(cb, { colorTier: '256' })`.

## What's deferred

Live escape-sequence probes (XTVERSION/DA2 handshakes) and a cached terminal profile are planned post-launch. Today's detection is synchronous, env-only, and conservative — unknown terminals get safe defaults and the overrides always win.
