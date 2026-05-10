# Bunti Development Roadmap (Gap Analysis)

This document tracks the features and enhancements required to fully migrate the Space Station UI to the Bunti engine.

## 1. Keyboard Input API
- **Goal:** Add a high-level API for handling keyboard events (Tab, Arrows, Enter, etc.) in the `render` loop.
- **Status:** ✅ Completed
- **Details:** Integrated into `src/render.ts`, state tracked in `src/state.ts`, and exposed via `BuntiContext` and `KEYS` constant in `src/dsl.ts`.

## 2. Component State & Focus Management
- **Goal:** Implement a way to manage "focused" state and local component state (e.g., `selectedIndex`).
- **Status:** ✅ Completed
- **Details:** Added `componentState`, `focusedId`, and `focusableIds` to `ScreenState`. Implemented `useState`, `focusable`, `isFocused`, and `focusNext` in `BuntiContext`. Enhanced `list` component to handle its own state and navigation.

## 3. Animation & Sequence API
- **Goal:** Create an abstraction for timed sequences and animations.
- **Status:** ✅ Completed
- **Details:** Added `startTime` to `ScreenState` and `elapsedTime`, `animate`, and `flicker` to `BuntiContext`. This allows for time-based effects and transitions directly in the DSL.

## 4. Enhanced Box & Header Styling
- **Goal:** Support flexible title placement and custom border characters.
- **Status:** ✅ Completed
- **Details:** Added `title`, `titleStyle`, and `titleAlign` to `StyleOptions`. Updated `box` to render titles in the top border. Added a `tactical` border style to match the Space Station aesthetic.

## 5. Reusable Panel Component Pattern
- **Goal:** Define a standard pattern for encapsulated TUI components.
- **Status:** ✅ Completed
- **Details:** Integrated `id`-based focus and styling into `box` and `list`. Components can now be defined as simple functions taking `BuntiContext` and using these IDs to automatically manage focus, navigation, and styling.
