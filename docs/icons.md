# Icons & Nerd Fonts

Bunti ships two icon tiers: a curated set of 88 short names with width-audited ASCII fallbacks, and the **entire Nerd Fonts v3.4.0 library — 10,763 glyphs by name** — as an opt-in subpath.

## Curated icons

```typescript
ctx.text(`${ctx.icon('rocket')} launching`);
ctx.text(`${ctx.icon('check')} tests green`);
ctx.text(`${ctx.icon('warning')} disk almost full`);
```

Every curated name has a single-character ASCII fallback of identical width, so layouts never shift when a terminal can't render Nerd Font glyphs.

## The full library

One import unlocks everything:

```typescript
import '@zakmandhro/bunti/icons-full'; // installs 10,763 glyphs (side-effect)

ctx.icon('fa-rocket');      // Font Awesome set
ctx.icon('md-robot');       // Material Design set
ctx.icon('cod-terminal');   // Codicons set
ctx.icon('nf-oct-git-branch'); // the nf- prefix is accepted too
```

Prefer an explicit call? `installFullIcons()` from the same subpath does the same thing.

**Autocomplete included** — the `IconName` type is a literal union of all 10,763 names, so your editor completes them and `tsc` catches typos:

```
error TS2820: Type '"fa-rocketz"' is not assignable to type 'IconName'.
Did you mean '"fa-rocket"'?
```

The glyph map lives only in the `icons-full` subpath — the core bundle stays lean (importing `@zakmandhro/bunti` alone pulls zero bytes of it).

## Custom icons

```typescript
import { register } from '@zakmandhro/bunti';

register('deploy', { nf: '', ascii: '^' }); // with an explicit ASCII tier
register('sparkle', '󱐀');               // bare glyph (falls back to '*')
```

## Emoji swapping

Common emoji in your strings are automatically swapped for width-1 Nerd Font glyphs (🚀 → , ✅ → , ⚠️ → ) so text stays grid-aligned. On the ASCII tier, emoji pass through **unchanged** — degradation applies to icons, not raw emoji.

## Degradation & detection

Whether glyphs render depends on the user's *font*, which no escape sequence can detect. Bunti resolves it with a per-terminal policy (see [Terminal Support](/terminal-support)):

| Tier | Meaning |
| :--- | :--- |
| `yes` | Ghostty ≥ 1.2 embeds a Symbols Nerd Font — glyphs always render |
| `assumed-yes` | kitty, WezTerm, iTerm2, Alacritty, Warp — power users overwhelmingly have an NF installed |
| `assumed-no` | VS Code terminal, Apple Terminal, unknown — you get the ASCII fallbacks |

Force it either way with `BUNTI_NF=1` / `BUNTI_NF=0`, or per-app with `render(cb, { nerdFont: true })`. Check what Bunti decided for your terminal:

```bash
bunx @zakmandhro/bunti doctor
```
