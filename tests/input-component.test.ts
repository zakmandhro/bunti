/**
 * Input cursor-core tests: grapheme-aware editing, inverse-video cursor,
 * horizontal scroll window, and modifier filtering via the KeyEvent queue.
 */

import { describe, expect, test } from 'bun:test';
import { Input } from '../src/components';
import { setColorTier } from '../src/detect';
import { createScreenContext } from '../src/dsl';
import { createKeyEvent, type KeyEvent } from '../src/input';
import { createScreenState, type ScreenState } from '../src/state';
import { darkTheme } from '../src/theme';

setColorTier('truecolor');

const ID = 'field';

function makeState(): ScreenState {
  const state = createScreenState();
  state.width = 80;
  state.height = 24;
  state.focusedId = ID;
  return state;
}

/** Runs one frame of the Input with the given KeyEvents. */
function frame(
  state: ScreenState,
  keys: KeyEvent[] = [],
  props: Record<string, unknown> = {},
) {
  state.keys = keys;
  state.lastKey = undefined;
  const ctx = createScreenContext(state);
  Input(ctx, { id: ID, width: 12, ...props });
  ctx.flushFlow();
  return ctx;
}

const value = (state: ScreenState) => state.componentState.get(ID) as string;
const cursor = (state: ScreenState) =>
  state.componentState.get(`${ID}_cursor`) as number;
const scroll = (state: ScreenState) =>
  state.componentState.get(`${ID}_scroll`) as number;

/** Reads the visible chars of a buffer row (skip cells excluded). */
function rowText(state: ScreenState, y: number): string {
  let out = '';
  for (let x = 0; x < state.width; x++) {
    const cell = state.backBuffer[y * state.width + x]!;
    if (!cell.skip) out += cell.char;
  }
  return out;
}

describe('Input editing (grapheme cursor)', () => {
  test('types at the cursor and tracks the position', () => {
    const state = makeState();
    frame(state, [createKeyEvent('a'), createKeyEvent('b')]);

    expect(value(state)).toBe('ab');
    expect(cursor(state)).toBe(2);
  });

  test('inserts at the cursor after arrow movement (emoji whole)', () => {
    const state = makeState();
    frame(state, [createKeyEvent('a'), createKeyEvent('b')]);
    frame(state, [createKeyEvent('left'), createKeyEvent('🍭')]);

    expect(value(state)).toBe('a🍭b');
    expect(cursor(state)).toBe(2);
  });

  test('backspace removes the grapheme before the cursor', () => {
    const state = makeState();
    state.componentState.set(ID, 'a🍭b');
    frame(state, [createKeyEvent('left'), createKeyEvent('backspace')]);

    expect(value(state)).toBe('ab');
    expect(cursor(state)).toBe(1);
  });

  test('delete removes the grapheme under the cursor', () => {
    const state = makeState();
    state.componentState.set(ID, '🍭bc');
    frame(state, [createKeyEvent('home'), createKeyEvent('delete')]);

    expect(value(state)).toBe('bc');
    expect(cursor(state)).toBe(0);
  });

  test('home/end and arrow clamping', () => {
    const state = makeState();
    state.componentState.set(ID, 'abc');

    frame(state, [createKeyEvent('home'), createKeyEvent('left')]);
    expect(cursor(state)).toBe(0);

    frame(state, [createKeyEvent('end'), createKeyEvent('right')]);
    expect(cursor(state)).toBe(3);
  });

  test('ctrl+a / ctrl+e jump to home and end', () => {
    const state = makeState();
    state.componentState.set(ID, 'abc');

    frame(state, [createKeyEvent('a', '\x01', { ctrl: true })]);
    expect(cursor(state)).toBe(0);
    expect(value(state)).toBe('abc'); // no 'a' inserted

    frame(state, [createKeyEvent('e', '\x05', { ctrl: true })]);
    expect(cursor(state)).toBe(3);
    expect(value(state)).toBe('abc');
  });

  test('other ctrl/alt combos and control bytes never insert', () => {
    const state = makeState();
    state.componentState.set(ID, 'abc');
    frame(state, [
      createKeyEvent('k', '\x0b', { ctrl: true }),
      createKeyEvent('x', '\x1bx', { alt: true }),
      createKeyEvent('f5', '\x1b[15~'),
      createKeyEvent('escape', '\x1b'),
      createKeyEvent('enter', '\r'),
    ]);

    expect(value(state)).toBe('abc');
  });

  test('release events are ignored', () => {
    const state = makeState();
    frame(state, [createKeyEvent('a', '', { kind: 'release' })]);
    expect(value(state)).toBe('');
  });

  test('unfocused inputs ignore the key queue', () => {
    const state = makeState();
    state.focusedId = 'elsewhere';
    frame(state, [createKeyEvent('a')]);
    expect(value(state)).toBe('');
  });
});

describe('Input cursor rendering (inverse video)', () => {
  // width 12 -> centered at x=34; text starts at x=36 (border + padding),
  // field row is y=1 (middle of the 3-row box).
  const TEXT_X = 36;
  const ROW = 1;

  test('cursor at end renders as an inverse-video space', () => {
    const state = makeState();
    state.componentState.set(ID, 'abc');
    frame(state, [createKeyEvent('end')]);

    const cursorCell = state.backBuffer[ROW * state.width + TEXT_X + 3]!;
    expect(cursorCell.char).toBe(' ');
    expect(cursorCell.bg).toEqual(darkTheme.foreground.rgb);
    expect(cursorCell.fg).toEqual(darkTheme.surface.rgb);
    // No appended block character anywhere in the row.
    expect(rowText(state, ROW)).not.toContain('█');
  });

  test('cursor mid-string inverses the grapheme under it', () => {
    const state = makeState();
    state.componentState.set(ID, 'abc');
    frame(state, [createKeyEvent('home'), createKeyEvent('right')]);

    const cursorCell = state.backBuffer[ROW * state.width + TEXT_X + 1]!;
    expect(cursorCell.char).toBe('b');
    expect(cursorCell.bg).toEqual(darkTheme.foreground.rgb);
    expect(cursorCell.fg).toEqual(darkTheme.surface.rgb);

    const plainCell = state.backBuffer[ROW * state.width + TEXT_X]!;
    expect(plainCell.char).toBe('a');
    expect(plainCell.fg).toEqual(darkTheme.foreground.rgb);
  });

  test('focused empty input shows the cursor before the placeholder', () => {
    const state = makeState();
    frame(state, [], { placeholder: 'Enter...' });

    const cursorCell = state.backBuffer[ROW * state.width + TEXT_X]!;
    expect(cursorCell.char).toBe(' ');
    expect(cursorCell.bg).toEqual(darkTheme.foreground.rgb);

    const placeholderCell = state.backBuffer[ROW * state.width + TEXT_X + 1]!;
    expect(placeholderCell.char).toBe('E');
    expect(placeholderCell.fg).toEqual(darkTheme.muted.rgb);
  });

  test('unfocused input renders no cursor cell', () => {
    const state = makeState();
    state.focusedId = 'elsewhere';
    state.componentState.set(ID, 'abc');
    frame(state);

    const afterText = state.backBuffer[ROW * state.width + TEXT_X + 3]!;
    expect(afterText.char).toBe(' ');
    expect(afterText.bg).toEqual(darkTheme.surface.rgb); // field bg, not inverse
  });

  test('password inputs mask the value but keep the cursor', () => {
    const state = makeState();
    state.componentState.set(ID, 'ab');
    frame(state, [createKeyEvent('end')], { type: 'password' });

    expect(rowText(state, ROW)).toContain('**');
    const cursorCell = state.backBuffer[ROW * state.width + TEXT_X + 2]!;
    expect(cursorCell.bg).toEqual(darkTheme.foreground.rgb);
  });
});

describe('Input horizontal scroll window', () => {
  // width 12 -> inner columns = 12 - 2 (borders) - 2 (padding) = 8.

  test('long ascii values scroll to keep the end-cursor visible', () => {
    const state = makeState();
    state.componentState.set(ID, 'abcdefghij'); // 10 cols, inner 8
    frame(state, [createKeyEvent('end')]);

    // 7 tail chars + 1 cursor space = 8 columns -> first 3 scrolled out.
    expect(scroll(state)).toBe(3);
    const row = rowText(state, 1);
    expect(row).toContain('defghij');
    expect(row).not.toContain('abc');
  });

  test('wide emoji count two columns in the window math', () => {
    const state = makeState();
    state.componentState.set(ID, '🍭🍭🍭🍭🍭🍭'); // 6 graphemes, 12 cols
    frame(state, [createKeyEvent('end')]);

    // 3 emoji (6 cols) + cursor space = 7 <= 8; 4 emoji would need 9.
    expect(scroll(state)).toBe(3);
    const row = rowText(state, 1);
    expect(row.match(/🍭/g)).toHaveLength(3);
  });

  test('moving the cursor back to the start scrolls the window home', () => {
    const state = makeState();
    state.componentState.set(ID, 'abcdefghij');
    frame(state, [createKeyEvent('end')]);
    expect(scroll(state)).toBe(3);

    frame(state, [createKeyEvent('home')]);
    expect(scroll(state)).toBe(0);
    expect(rowText(state, 1)).toContain('abcdefg');
  });
});
