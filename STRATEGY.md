# Bunti / Space Station / CoAgency — Strategy Memo

_Date: 2026-05-11_
_Author: Zak + Claude (working session)_

A working memo from a strategy review of three concurrent projects: **Bunti** (a Bun-native TUI lib), **Space Station** (a multi-agent orchestration TUI), and **CoAgency** (the AI-native workspace SaaS — the actual business).

---

## TL;DR

- **CoAgency is the company.** Everything else exists to serve it.
- **Space Station** has no path as a standalone product (commoditized market, 12+ direct competitors including Microsoft and a funded Mac app), but it is a **strong credibility/audience-building artifact** when reframed as a public personal tool.
- **Bunti** has no defensible standalone position vs Ink. Its honest role: the **artistic signature renderer** inside Space Station — logo, splash, signature panes — not a public library.
- **Action:** ship Space Station publicly as "personal mission control," use Ink for the dashboard structure, keep Bunti as internal art-rendering, commit to a 90-day build-in-public posting cadence that ladders to CoAgency's launch.

---

## 1. Bunti — Honest Position

### What it is today
- ~2,200 LOC TypeScript, Bun-native
- 6.2 MB `node_modules`, 1 runtime dep (picocolors)
- Cell buffer + diff renderer, flow-cursor DSL, managed state, mouse hit-testing, Nerd Font icon registry, just-added bold support
- Components: Card, Button, Input

### Bundle / dep comparison

| | Bunti | Ink | OpenTUI |
|---|---|---|---|
| `node_modules` | **6.2 MB** | 17 MB | 45 MB |
| Direct + transitive deps | **1** | 38 | many + native |
| Native binary | none | none (WASM) | **`.dylib` per platform** |
| Layout | hand-rolled | Yoga (WASM) | Yoga-style (native) |
| Framework tax | none | React | React/Solid optional |

### Where Bunti could have been a real lib
- **Moat vs OpenTUI:** "no binary deps" is real (OpenTUI ships `libopentui.dylib`).
- **Moat vs Ink:** Ink also has no native bins (Yoga is WASM). Bunti's only real advantages are: ~3× smaller install, no React tax, functional DSL.

### Why we're not pursuing it as a public lib
- LLMs are already excellent at Ink/React; Bunti's DSL has zero training data.
- Ink ships in Claude Code, Copilot CLI, Gemini CLI — proven at scale.
- Bus factor of one. Maintenance cost couples to Space Station.
- "shadcn for terminals" is a real gap but requires a `bunx bunti add` installer + 5+ polished components — months of work for an uncertain audience.

### Honest role going forward
**Artistic signature inside Space Station.** Splash screens, the Mission Control logo, planet glyph hover effects — the visual flourishes that make Space Station screenshots distinct. Not a public library. No `npm publish`. Internal subdirectory of Space Station.

---

## 2. Space Station — Honest Position

### What it is today
- Multi-harness TUI for parallel agent orchestration via git worktrees
- Used daily by the author for real CoAgency development
- Distinct identity: "Planets / Mission Control" metaphor, "TUI Artist" aesthetic, Catppuccin pill UI, atomic NF v3 iconography

### The features actually used every day
1. Tiled tmux UI with all agent screens visible at once
2. Dashboard pane (PRs / issues / merges / actions)
3. Hooks (auto-approve PRs, spoken announcements)
4. Keyboard shortcuts for pane / window / zoom
5. **Simultaneous Claude + Gemini + Codex + OpenCode**

### Market reality (12+ direct competitors found in 10 minutes)

| Tool | Notable |
|---|---|
| [Claude Squad](https://github.com/smtg-ai/claude-squad) | Multi-vendor (Claude/Codex/Gemini/Aider/OpenCode/Amp), tmux+worktree, Go TUI |
| [Conductor.build](https://www.conductor.build/) | **Commercial Mac app**, funded, beautiful UI |
| [Microsoft Conductor](https://github.com/microsoft/conductor) | Web dashboard, DAG graph, agent streaming |
| [cmux](https://cmux.com/) | tmux for Claude Code; tiled panes, SSH-ready |
| [ccmanager](https://github.com/kbwo/ccmanager) | Claude/Gemini/Codex/Cursor/Copilot/Cline/OpenCode/Kimi |
| [agent-orchestrator (Composio)](https://github.com/ComposioHQ/agent-orchestrator) | Plans, spawns, CI/conflict/review automation |
| [ccswarm](https://github.com/nwiizo/ccswarm), [code-conductor](https://github.com/ryanmac/code-conductor), [parallel-code](https://github.com/johannesjo/parallel-code), [claude-tmux](https://github.com/nielsgroen/claude-tmux), [workmux](https://github.com/raine/workmux), Vibe Kanban, amux, IttyBitty, Conductor OSS | Variations on the same theme |

Plus Claude Code's native "teammates split panes" feature is shipping. The base pattern (tmux + worktree + claude code) is **commoditized**.

### What Space Station has that competitors don't

- **The aesthetic + Planets/Mission Control metaphor** (genuinely original)
- **Tiled-always-visible + multi-vendor + integrated dashboard + hooks combined** — no single competitor does all four. cmux is best at tiling but Claude-centric. Claude Squad is best at multi-vendor but session-switching. There's a real gap, but it's a personal-workflow gap, not a market gap.

### Why we won't pursue it as a product
- Commoditized category; Microsoft and a funded Mac app already in it
- Differentiator is aesthetic, not technical
- Maintenance/issues/triage cost would directly tax CoAgency time
- No revenue path

### What about as an "off-the-shelf replacement" stack?

If we killed Space Station tomorrow, the closest replacement stack would be:

| Need | Replacement |
|---|---|
| Tiled multi-agent | cmux (Claude-only) or Claude Squad (sessions, not tiled) |
| GitHub dashboard | `gh dash` in a tmux pane |
| Hooks (auto-approve, speak) | Claude Code native hooks + shell scripts |
| Keyboard shortcuts | tmux native |
| Multi-vendor agents | Claude Squad |

The off-the-shelf stack genuinely doesn't replicate "tiled + multi-vendor + dashboard" today. **Killing Space Station outright is productivity-negative in the short term.** Re-evaluate in 6 months when cmux/Claude Squad probably close that gap.

---

## 3. CoAgency — The Actual Company

- B2B SaaS: "work that coordinates itself" via a Work Graph connecting Slack/GitHub/Linear/Jira/Figma/Drive + AI agents on top
- Evolution of PullFlow; has YC demo, prelaunch website, design system
- TAM: AI-native workspace category — one of the hottest 2026 enterprise plays (Linear/Asana/Notion + AI)
- This is where every spare hour should go.

The seductive trap: Space Station is *fun* (visible progress, beautiful TUI, dopamine). CoAgency is *hard* (B2B integrations, sales, design). Default tendency is to drift toward the fun thing. Must resist.

---

## 4. The Reframe — Space Station as Credibility, Not Product

The original goal of building Bunti/Space Station was **to revive a "dead" X presence by walking into the AI-dev conversation with an interesting OSS offering**, rather than self-promoting a closed-source SaaS. This changes the question.

### OSS-as-audience-builder pattern
Success cases (shadcn, Cal.com, Resend, Supabase, Drizzle, Charm/Bubble Tea) share three traits:
1. The artifact is **visually screenshottable** in a single image.
2. There's a **build-in-public narrative**, not just a launch tweet.
3. The founder **shows up consistently for ≥3 months**.

The failures (1000× more of them) ship once and disappear.

### Bunti vs Space Station as the credibility artifact

| | Bunti | Space Station |
|---|---|---|
| Screenshottable | Decent (a login card) | **Strong** (MC tiled, 4 agents working live) |
| Original aesthetic | OK | **Strong** (Planets metaphor) |
| On-trend in 2026 | Mild (TUI revival) | **Very** (AI agents is the topic) |
| Story potential | One post worth | **Months** of build-in-public content |
| Ladders into CoAgency pitch | Weak | **Strong** ("SS coordinates agents; CoAgency coordinates teams") |
| Bikeshed risk | High (TUI lib opinions) | Lower (workflow, not framework) |
| Maintenance if it lands | Low | Higher but manageable |

**Space Station is the stronger credibility play.** Not close.

---

## 5. Recommendation — The Final Stack

1. **Ship Space Station publicly as a "personal mission control" with a build-in-public narrative. Not as a product.**
2. **Use Ink** under the hood for the dashboard/structure (kills the React-overhead concern; gains huge ecosystem).
3. **Keep Bunti** as the artistic signature inside Space Station (splash, logo, signature panes). No separate `npm publish`. No docs site. No launch.
4. **90-day posting commitment from Zak + Amna.** This is the actual investment, not the code. If we can't commit to 2 posts/week for 90 days, *don't* make Space Station public.
5. **Every artifact ladders to CoAgency** (README link, every 5th post, X bio).
6. **Position Space Station's README** to lower expectations:
   > "Space Station is my personal mission control for running parallel AI coding agents. It's open source because the workflow might help you. MIT, no SLAs, contributions welcome. — Built by [@you] while building [CoAgency](link)."

### Engineering rules to keep maintenance cheap
- Stay on `0.x` forever. No 1.0, no roadmap.
- Issues triaged on weekends only. Pin a note.
- PRs merged generously, not curated aggressively.
- Any feature taking >30 min that has an off-the-shelf alternative → use the alternative.

### Posting strategy (sketch)
- **Hero post:** screen recording of MC running Claude+Codex+Gemini+OpenCode tiled with `gh dash` and a live PR landing.
- **Weekly:** one build-in-public post (added agent, hook idea, design rationale).
- **Replies > originals:** thoughtful engagement on every Claude Squad / cmux / Conductor post.
- **CoAgency seeds:** every 4-5 posts, drop a "we're applying this thinking to teams over at CoAgency" line.

---

## 6. Gut-check before executing

> If Space Station hits 5K stars in 90 days and we have a constant trickle of issues/PRs, can we handle that without it eating CoAgency time?

If yes — ship it.
If no — keep it private, focus 100% on CoAgency, and accept that the X re-entry happens with a different artifact later.

---

## 7. Open questions

- Can Amna co-author the posting cadence? (Halves the per-person commitment.)
- Should Space Station's public repo include `coagency.com` link prominently from day one, or hold it back until CoAgency is ready to launch?
- Migration plan from current Bunti renderer in Space Station → Ink (estimated ~1 day).
- Which "Bunti signature flourish" do we keep visible in the public MC build? (Logo + splash is probably enough.)
