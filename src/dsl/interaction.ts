/**
 * Bunti DSL interaction: hitboxes, hover/press/click queries, and focus
 * management.
 *
 * Click semantics: a 'click' KeyEvent is emitted once, on SGR mouse RELEASE,
 * carrying the press-origin coordinates (state.clickX/clickY). isClicked is
 * therefore true exactly one frame per click — components fire actions once
 * per click instead of every frame the button is held.
 *
 * Hit-testing semantics:
 * - Topmost wins: when several hitboxes contain the point, only the
 *   last-registered one (declaration order; layers render later, so later
 *   registration = visually on top) reports hovered/pressed/clicked.
 * - hitbox() evaluates against the PREVIOUS frame's settled rect for its id
 *   when one exists: registration rects can still be re-placed by the direct
 *   box renderer at paint time (auto-height measure, content alignment), and
 *   a click physically happened on the frame the user was looking at. New
 *   ids fall back to their freshly resolved rect.
 * - The isHovered/isPressed/isClicked query forms evaluate against the
 *   current frame's registrations (they are called after registration).
 */

import type { Rect, RectInput } from '../geometry';
import type { Hitbox, ScreenState } from '../state';
import type { BuntiContext, HitboxBounds } from './types';

type Interaction = Pick<
  BuntiContext,
  | 'focusable'
  | 'isFocused'
  | 'focus'
  | 'focusNext'
  | 'hitbox'
  | 'isHovered'
  | 'isPressed'
  | 'isClicked'
  | 'isHoverEnter'
  | 'isHoverLeave'
>;

function contains(box: Hitbox, x: number, y: number): boolean {
  return (
    x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height
  );
}

/**
 * Last-registered (= topmost) hitbox id containing the point, if any.
 * Map iteration follows insertion order, so the last containing entry is
 * the one declared latest — layers render later, hence visually on top.
 */
function topmostAt(
  map: Map<string, Hitbox> | undefined,
  x: number,
  y: number,
): string | undefined {
  if (!map) return undefined;
  let top: string | undefined;
  for (const box of map.values()) {
    if (contains(box, x, y)) top = box.id;
  }
  return top;
}

/**
 * True when `id` is the topmost hitbox at the point, or when the map has
 * no containing entry at all (first-frame fallback: nothing is known to
 * cover the point, so the caller's own containment test decides).
 */
function isTopmost(
  map: Map<string, Hitbox> | undefined,
  id: string,
  x: number,
  y: number,
): boolean {
  const top = topmostAt(map, x, y);
  return top === undefined || top === id;
}

/**
 * True when this frame carries a click. `state.keys` covers events drained
 * by the render loop; the `state.lastKey === 'click'` check keeps manually
 * driven states (tests, custom loops) working.
 */
function frameHasClick(state: ScreenState): boolean {
  if (state.lastKey === 'click') return true;
  return (
    state.keys?.some((e) => e.key === 'click' && e.kind !== 'release') ?? false
  );
}

/** Click test point: press-origin when available, mouse position otherwise. */
function clickX(state: ScreenState): number {
  return state.clickX ?? state.mouseX;
}

function clickY(state: ScreenState): number {
  return state.clickY ?? state.mouseY;
}

export function createInteraction(
  state: ScreenState,
  resolveRect: (bounds: RectInput) => Rect,
  capture?: (box: Hitbox, flow?: { line: number; col: number }) => void,
): Interaction {
  const interaction: Interaction = {
    focusable(id: string) {
      if (!state.focusableIds.includes(id)) {
        state.focusableIds.push(id);
      }
      if (!state.focusedId) state.focusedId = id;
      return state.focusedId === id;
    },

    isFocused(id: string) {
      return state.focusedId === id;
    },

    focus(id: string) {
      state.focusedId = id;
    },

    focusNext() {
      if (state.focusableIds.length === 0) return;
      const idx = state.focusableIds.indexOf(state.focusedId || '');
      const nextIdx = (idx + 1) % state.focusableIds.length;
      state.focusedId = state.focusableIds[nextIdx];
    },

    hitbox(id: string, bounds: HitboxBounds) {
      const rect = resolveRect(bounds);
      const box: Hitbox = { id, ...rect };
      state.hitboxes.set(id, box);
      // Direct boxes re-place captured hitboxes once their painted rect is
      // known; flow-anchored entries carry their content-local (line, col).
      capture?.(
        box,
        bounds.flow ? { line: bounds.y ?? 0, col: bounds.x ?? 0 } : undefined,
      );

      // Evaluate against last frame's settled rect when this id existed
      // (the rect the user actually saw); fall back to the fresh rect.
      const prev = state.prevHitboxes;
      const eff = prev?.get(id) ?? box;
      const hovered =
        contains(eff, state.mouseX, state.mouseY) &&
        isTopmost(prev, id, state.mouseX, state.mouseY);

      // Hover-change tracking against the last evaluation of this id.
      const prevHovered = state.hoverStates.get(id) ?? false;
      if (hovered !== prevHovered) {
        if (hovered) {
          state.hoverEntered.add(id);
          state.hoverLeft.delete(id);
        } else {
          state.hoverLeft.add(id);
          state.hoverEntered.delete(id);
        }
        state.hoverStates.set(id, hovered);
      }

      const pressed = hovered && state.isMouseDown && state.mouseButton === 0;
      const clicked =
        frameHasClick(state) &&
        contains(eff, clickX(state), clickY(state)) &&
        isTopmost(prev, id, clickX(state), clickY(state));

      return { box, hovered, pressed, clicked };
    },

    isHovered(id: string) {
      const box = state.hitboxes.get(id);
      if (!box) return false;
      return (
        contains(box, state.mouseX, state.mouseY) &&
        isTopmost(state.hitboxes, id, state.mouseX, state.mouseY)
      );
    },

    isPressed(id: string) {
      return (
        interaction.isHovered(id) &&
        state.isMouseDown &&
        state.mouseButton === 0
      );
    },

    isClicked(id: string) {
      const box = state.hitboxes.get(id);
      if (!box) return false;
      return (
        frameHasClick(state) &&
        contains(box, clickX(state), clickY(state)) &&
        isTopmost(state.hitboxes, id, clickX(state), clickY(state))
      );
    },

    isHoverEnter(id: string) {
      return state.hoverEntered.has(id);
    },

    isHoverLeave(id: string) {
      return state.hoverLeft.has(id);
    },
  };
  return interaction;
}
