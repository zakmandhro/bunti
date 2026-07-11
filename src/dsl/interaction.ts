/**
 * Bunti DSL interaction: hitboxes, hover/press/click queries, and focus
 * management.
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
>;

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
      const hovered =
        state.mouseX >= box.x &&
        state.mouseX < box.x + box.width &&
        state.mouseY >= box.y &&
        state.mouseY < box.y + box.height;
      const pressed = hovered && state.isMouseDown && state.mouseButton === 0;
      const clicked = hovered && state.lastKey === 'click';

      return { box, hovered, pressed, clicked };
    },

    isHovered(id: string) {
      const box = state.hitboxes.get(id);
      if (!box) return false;
      return (
        state.mouseX >= box.x &&
        state.mouseX < box.x + box.width &&
        state.mouseY >= box.y &&
        state.mouseY < box.y + box.height
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
      return interaction.isHovered(id) && state.lastKey === 'click';
    },
  };
  return interaction;
}
