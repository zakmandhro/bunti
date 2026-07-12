---
layout: home

hero:
  name: "Bunti"
  text: "Terminal UIs that feel like the web."
  tagline: "A Bun-native, zero-dependency TUI engine with live themes, 10,763 icons, mouse & motion — designed so coding agents write it fluently."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Try it — bunx demo
      link: /getting-started#try-it-in-one-line
    - theme: alt
      text: View on GitHub
      link: https://github.com/zakmandhro/bunti

features:
  - icon: 🤖
    title: Built for coding agents
    details: 550+ JSDoc blocks in the shipped types, runtime hints that teach, and a generated llms.txt. Fresh-agent evals one-shot real apps from the published package.
    link: /for-agents
  - icon: 🎨
    title: Themes out of the box
    details: Semantic tokens, live setTheme(), and six WCAG-gated presets converted from VS Code — Dracula, Tokyo Night, Catppuccin, Nord, One Dark Pro, GitHub Light.
    link: /theming
  - icon: ✨
    title: 10,763 icons by name
    details: The full Nerd Fonts library with TypeScript autocomplete, plus emoji swapping and graceful ASCII degradation driven by real terminal detection.
    link: /icons
  - icon: 🖱️
    title: Web-grade interaction
    details: Mouse, hover effects, pointer cursor, click-on-release, modals with backdrop scrims and drop shadows, Spinner/Progress/Link components.
    link: /input-and-mouse
  - icon: 🎞️
    title: First-class motion
    details: Enter/exit transitions, staggered cascades, 14 easing curves, per-frame dt — time-based animation that stays smooth at 60fps.
    link: /animations
  - icon: 🛟
    title: Fast, safe, zero-dep
    details: ~0.4ms full-screen draw at 120×40 via a double-buffered diff renderer. Guaranteed terminal restore on any crash. Zero runtime dependencies, Bun-native.
    link: /engine
---

<div class="bunti-section">
  <h2>Mission Control — a full dashboard in one file</h2>
  <p class="bunti-sub">Live theme switching, sparklines, Nerd Font icons, staggered entrances, mouse-clickable rows. One file, no framework.</p>
  <video src="/mission-control.mp4" autoplay loop muted playsinline></video>
</div>

<div class="bunti-section">
  <h2>Your VS Code theme, in the terminal</h2>
  <p class="bunti-sub">Every component styles itself from semantic tokens — swap the whole app's look in one call, live.</p>
  <video src="/theme-switcher.mp4" autoplay loop muted playsinline></video>
</div>

<div class="bunti-section">
  <h2>Smooth enough to play</h2>
  <p class="bunti-sub">Double-buffered cell diffing sends only dirty spans to the terminal — animation stays crisp.</p>
  <video src="/2048.mp4" autoplay loop muted playsinline></video>
  <blockquote class="bunti-quote">
    “~90% of the feature matrix worked on the literal first run — the docs and API generated zero iterations.”
    <span>— independent fresh-agent ergonomics evaluation, building a themed, animated, mouse-driven app against the published package</span>
  </blockquote>
</div>

<div class="bunti-section">
  <h2>Try it in one line</h2>

```bash
bunx @zakmandhro/bunti demo mission-control   # the dashboard above, zero install
bunx @zakmandhro/bunti doctor                 # what can YOUR terminal do?
bun add @zakmandhro/bunti                     # build your own
```

</div>

<style>
.bunti-section { max-width: 1152px; margin: 0 auto; padding: 56px 24px 0; text-align: center; }
.bunti-section video { width: 100%; max-width: 960px; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,.35); }
.bunti-section h2 { font-size: 26px; font-weight: 650; margin: 0 0 6px; border: none; padding: 0; }
.bunti-sub { color: var(--vp-c-text-2); margin: 0 0 22px; }
.bunti-quote { max-width: 720px; margin: 44px auto 0; padding: 20px 28px; border-left: 3px solid var(--vp-c-brand-1); background: var(--vp-c-bg-soft); border-radius: 8px; text-align: left; font-style: italic; }
.bunti-quote span { display: block; margin-top: 10px; font-style: normal; font-size: 13px; color: var(--vp-c-text-2); }
.bunti-section div[class*='language-'] { text-align: left; max-width: 720px; margin: 0 auto; }
</style>
