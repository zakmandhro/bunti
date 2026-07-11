/**
 * Bunti DSL interaction: hitboxes, hover/press/click queries, and focus
 * management.
 *
 * Click semantics: a 'click' KeyEvent is emitted once, on SGR mouse RELEASE,
 * carrying the press-origin coordinates (state.clickX/clickY). isClicked is
 * therefore true exactly one frame per click — components fire actions once
 * per click instead of every frame the button is held.
 */

import type { Rect, RectInput } from '../geometry';
import type { Hitbox, ScreenState } from '../state';
import type { BuntiContext } from './types';

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

    hitbox(id: string, bounds: RectInput) {
      const rect = resolveRect(bounds);
      const box: Hitbox = { id, ...rect };
      state.hitboxes.set(id, box);
      const hovered = contains(box, state.mouseX, state.mouseY);

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
        frameHasClick(state) && contains(box, clickX(state), clickY(state));

      return { box, hovered, pressed, clicked };
    },

    isHovered(id: string) {
      const box = state.hitboxes.get(id);
      if (!box) return false;
      return contains(box, state.mouseX, state.mouseY);
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
        frameHasClick(state) && contains(box, clickX(state), clickY(state))
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
