# 🥟 Bunti <-> Space Station: Gap Analysis & Roadmap

This document tracks the technical gaps between the **Bunti TUI Engine** and the requirements for a clean, professional API in **Space Station**.

## 🔴 Critical Gaps (Architectural)

### 1. Async Data Lifecycle (`useAsync`)
- **Status**: ✅ Completed
- **Problem**: `space-station` needs to fetch data (GitHub, Git, Hooks) in the background. Currently, `bunti.render` is a synchronous loop.
- **Requirement**: A hook that handles async state without blocking the UI thread or requiring manual `setInterval` management outside the engine.
- **Target API**:
  ```typescript
  const { data, loading, error } = useAsync(fetchData, { interval: 30000 });
  ```
- **Details**: Added full keyless signature support to `useAsync`. State resolution and completion automatically trigger a terminal tick rerender.

### 2. Relative & Flex Layouts
- **Problem**: Current layouts are "Absolute" or "Auto" (based on content size). There is no way to define "30% width" or "fill remaining height".
- **Requirement**: A flexbox-inspired layout system for `box()` that understands percentages and `flex: 1`.
- **Target API**:
  ```typescript
  b.box({ width: '30%', height: '100%' }, (sidebar) => { ... });
  ```

### 3. Hierarchical Input Routing
- **Problem**: Input (Up/Down/Enter) is global. If a list is focused, it should "consume" the keys so the parent doesn't also scroll or switch tabs.
- **Requirement**: An event propagation system where the `focusedId` gets first dibs on the `lastKey`.
- **Target API**: 
  - Automated handling in `b.list()` and `b.button()`.
  - `ctx.consumeKey()` to prevent bubbling.

---

## 🟡 Major Gaps (Developer Experience)

### 4. Semantic Theming
- **Problem**: `space-station` imports its own `colors` and `symbols` objects.
- **Requirement**: A top-level Theme provider in Bunti so components can use semantic keys.
- **Target API**:
  ```typescript
  b.text(b.theme.primary("Mission Control"));
  ```

### 5. Component Local State
- **Status**: ✅ Completed
- **Problem**: `useState` requires manual string keys (`useState('my-index', 0)`), which leads to collisions in complex UIs.
- **Requirement**: Automatic key generation based on component call-stack position (similar to React hooks).
- **Details**: Added full index-based keyless signature support to `useState` that operates deterministically across rendering ticks.

---

## 🟢 Minor Gaps (Features)

### 6. Floating Overlays & Modals
- **Problem**: Everything is rendered in a single flat pass.
- **Requirement**: A "Layer" system or a `z-index` equivalent for rendering modals on top of existing content.

### 7. Global Key Bindings
- **Problem**: `space-station` manually handles `q` for quit and `tab` for focus in a massive `switch` or `if` block.
- **Requirement**: A declarative way to register global shortcuts.
- **Target API**:
  ```typescript
  b.onKey('q', () => process.exit());
  b.onKey('ctrl+p', () => showCommandPalette());
  ```

---

## 🗺️ Resolution Roadmap

1. [x] **Phase 1**: Implement `useAsync` and background data fetching.
2. [ ] **Phase 2**: Refactor Layout engine to support Flex/Percentages.
3. [ ] **Phase 3**: Formalize Focus and Input capture system.
4. [ ] **Phase 4**: Add Overlay/Layering support.
5. [ ] **Phase 5**: Introduce Semantic Theming.
