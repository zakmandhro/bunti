import type { BuntiContext } from '../dsl';
import type { StyleOptions } from '../layout';
import { charWidth, indentBlock } from '../utils';

/** Props for Input. */
export interface InputProps extends StyleOptions {
  /** Stable id: keys the value state, focus slot, and hitbox. */
  id: string;
  /** Label rendered above the field. */
  label?: string;
  /** Ghost text shown while the field is empty. */
  placeholder?: string;
  /** Initial value (state lives in useState(id) afterwards). */
  value?: string;
  /** 'password' masks every glyph as '*'. */
  type?: 'text' | 'password';
  /** Fires with the new value after every edit. */
  onChange?: (value: string) => void;
}

/** Key names that must never insert as text. */
const NON_TEXT_KEYS = new Set([
  'up',
  'down',
  'left',
  'right',
  'enter',
  'escape',
  'tab',
  'backspace',
  'home',
  'end',
  'delete',
  'pageup',
  'pagedown',
  'insert',
  'click',
  'wheel_up',
  'wheel_down',
]);

const FN_KEY_RE = /^f\d{1,2}$/;

function graphemes(text: string): string[] {
  if (text.length === 0) return [];
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

function isTextKey(key: string): boolean {
  return key.length > 0 && !NON_TEXT_KEYS.has(key) && !FN_KEY_RE.test(key);
}

interface EditResult {
  value: string;
  cursor: number;
  changed: boolean;
}

/**
 * Applies one frame of KeyEvents to the (value, cursor) pair. Grapheme-aware:
 * cursor is a grapheme index, insert/delete operate on whole graphemes.
 * Ctrl/alt combos never insert; ctrl+a/ctrl+e map to home/end (readline).
 */
function applyKeys(
  keys: BuntiContext['keys'],
  value: string,
  cursor: number,
): EditResult {
  let glyphs = graphemes(value);
  let pos = Math.max(0, Math.min(cursor, glyphs.length));
  let changed = false;

  for (const event of keys) {
    if (event.kind === 'release') continue;

    if (event.ctrl || event.alt) {
      // Readline muscle memory; every other modified combo is ignored so
      // control bytes can never leak into the value.
      if (event.ctrl && !event.alt && event.key === 'a') pos = 0;
      if (event.ctrl && !event.alt && event.key === 'e') pos = glyphs.length;
      continue;
    }

    switch (event.key) {
      case 'left':
        pos = Math.max(0, pos - 1);
        break;
      case 'right':
        pos = Math.min(glyphs.length, pos + 1);
        break;
      case 'home':
        pos = 0;
        break;
      case 'end':
        pos = glyphs.length;
        break;
      case 'backspace':
        if (pos > 0) {
          glyphs = [...glyphs.slice(0, pos - 1), ...glyphs.slice(pos)];
          pos--;
          changed = true;
        }
        break;
      case 'delete':
        if (pos < glyphs.length) {
          glyphs = [...glyphs.slice(0, pos), ...glyphs.slice(pos + 1)];
          changed = true;
        }
        break;
      default:
        if (isTextKey(event.key)) {
          glyphs = [...glyphs.slice(0, pos), event.key, ...glyphs.slice(pos)];
          pos++;
          changed = true;
        }
    }
  }

  return { value: glyphs.join(''), cursor: pos, changed };
}

interface CursorWindow {
  /** First visible grapheme index (persist as the new scrollX). */
  scroll: number;
  /** Graphemes before the cursor cell (already windowed). */
  before: string;
  /** The grapheme under the cursor (' ' when the cursor is at the end). */
  cursorGlyph: string;
  /** Graphemes after the cursor cell that still fit. */
  after: string;
}

/**
 * Computes the horizontal scroll window that keeps the cursor visible in
 * `innerW` columns. Width-aware: wide graphemes (emoji) count their real
 * column width, so the window never overflows the field.
 */
function cursorWindow(
  glyphs: string[],
  cursor: number,
  scrollX: number,
  innerW: number,
): CursorWindow {
  const widths = glyphs.map((g) => charWidth(g));
  const cursorGlyph = cursor < glyphs.length ? glyphs[cursor]! : ' ';
  const cursorW = cursor < glyphs.length ? widths[cursor]! : 1;

  let scroll = Math.max(0, Math.min(scrollX, glyphs.length));
  if (cursor < scroll) scroll = cursor;

  const spanWidth = (from: number) => {
    let w = 0;
    for (let i = from; i < cursor; i++) w += widths[i]!;
    return w + cursorW;
  };
  // Scroll right until the cursor cell fits (tail view when cursor at end).
  while (scroll < cursor && spanWidth(scroll) > innerW) scroll++;

  const before = glyphs.slice(scroll, cursor).join('');
  let used = spanWidth(scroll);
  let after = '';
  for (let i = cursor + 1; i < glyphs.length; i++) {
    if (used + widths[i]! > innerW) break;
    after += glyphs[i]!;
    used += widths[i]!;
  }

  return { scroll, before, cursorGlyph, after };
}

/**
 * Tactical Input Component
 * Managed state HOC with a grapheme-aware editing cursor (insert/delete at
 * cursor, arrows/home/end, ctrl+a/ctrl+e), an inverse-video cursor cell, and
 * a width-aware horizontal scroll window.
 */
export function Input(ctx: BuntiContext, props: InputProps) {
  const { box, color, focusable, state, useState, hitbox, resolveLocalRect } =
    ctx;

  // 1. Mouse Hit-Testing
  const contentWidth = 40;
  const contentHeight = 3;
  const labelOffset = props.label ? 1 : 0;
  const area = resolveLocalRect({
    y: ctx.cursorY + labelOffset,
    width: props.width ?? contentWidth,
    height: props.height ?? contentHeight,
    contentWidth,
    contentHeight,
  });

  const interaction = hitbox(props.id, {
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    // In a box the field joins the text flow (indented to area.x), so the
    // hitbox is flow-anchored and re-placed with the painted line — content
    // alignment can't separate it from the rendered field.
    flow: !ctx.isRoot,
  });
  const isHovered = interaction.hovered;

  // If clicked, force focus state
  if (interaction.pressed) {
    state.focusedId = props.id;
  }

  // 2. Register in the global focus loop
  const isSelected = focusable(props.id);

  // 3. Manage internal state: value + grapheme cursor + scroll window
  const [value, setValue] = useState(props.id, props.value || '');
  const [storedCursor, setCursor] = useState(
    `${props.id}_cursor`,
    graphemes(value).length,
  );
  const [scrollX, setScrollX] = useState(`${props.id}_scroll`, 0);

  // The value can change externally (props/onChange round-trips): re-clamp.
  let glyphs = graphemes(value);
  let cursor = Math.max(0, Math.min(storedCursor, glyphs.length));

  // 4. Keyboard interaction via the KeyEvent frame queue (only when focused)
  if (isSelected && ctx.keys.length > 0) {
    const edit = applyKeys(ctx.keys, value, cursor);
    if (edit.changed) {
      setValue(edit.value);
      if (props.onChange) props.onChange(edit.value);
      glyphs = graphemes(edit.value);
    }
    if (edit.cursor !== storedCursor) setCursor(edit.cursor);
    cursor = edit.cursor;
  }

  // 5. Resolve Theme — all colors come from ctx.theme tokens so the field
  // restyles on live theme swaps.
  const theme = ctx.theme;
  const borderCol = isSelected
    ? theme.focus
    : isHovered
      ? theme.muted
      : theme.border;
  const labelColor = theme.foreground;
  const placeholderColor = theme.muted;
  const textColor = theme.foreground;

  // Inverse-video cursor cell: swap the field's fg/bg at the cursor.
  const inverse = (s: string) =>
    color.bg(theme.foreground, color.fg(theme.surface, s));

  const displayGlyphs =
    props.type === 'password' ? glyphs.map(() => '*') : glyphs;
  // Inner columns between the borders and [0,1] padding.
  const innerW = Math.max(1, area.width - 4);

  let fieldValue = '';
  if (glyphs.length === 0) {
    const placeholder = props.placeholder
      ? color.fg(placeholderColor, props.placeholder)
      : '';
    // Focused empty field: inverse-space cursor, ghost placeholder after it.
    fieldValue = isSelected ? inverse(' ') + placeholder : placeholder;
  } else if (isSelected) {
    const win = cursorWindow(displayGlyphs, cursor, scrollX, innerW);
    if (win.scroll !== scrollX) setScrollX(win.scroll);
    fieldValue =
      color.fg(textColor, win.before) +
      inverse(win.cursorGlyph) +
      color.fg(textColor, win.after);
  } else {
    fieldValue = color.fg(textColor, displayGlyphs.join(''));
  }

  const field = box(
    {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      border: 'rounded',
      borderColor: borderCol,
      bgColor: theme.surface,
      padding: [0, 1],
      align: 'left',
      valign: 'middle',
      detach: true,
    },
    ({ text }) => text(fieldValue),
  );

  if (props.label) {
    ctx.text(color.fg(labelColor, props.label));
    ctx.text('\n');
  }
  const renderedField = ctx.isRoot ? field : indentBlock(field, area.x);
  if (!ctx.isRoot) {
    ctx.text(renderedField);
  }
  return renderedField;
}
