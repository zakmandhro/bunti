/**
 * Mouse-geometry regression tests (README invariant: "Hitboxes and rendered
 * output share the same resolved rect").
 *
 * Covers the two silent blockers found by the 0.2.0 ergonomics eval:
 * 1. Auto-height root boxes painted vertically centered while their
 *    sub-context (and every hitbox registered inside) stayed top-anchored —
 *    clicks landed rows away from the pixels.
 * 2. Inline components ignored the flow cursor (two Buttons on one line
 *    registered IDENTICAL hitboxes) and overlapping hitboxes ALL fired on
 *    one click instead of only the topmost.
 * Plus: Modal's entrance slide is paint-only — hitboxes sit at the settled
 * coordinates from the first frame.
 */

import { describe, expect, test } from 'bun:test';
import { Button, Modal } from '../src/components';
import { setColorTier } from '../src/detect';
import { type BuntiContext, createScreenContext } from '../src/dsl';
import { stripAnsi } from '../src/index';
import {
  type Cell,
  clearBackBuffer,
  createScreenState,
  type ScreenOptions,
  type ScreenState,
} from '../src/state';

// Pin the color tier so expectations don't depend on the host terminal env.
setColorTier('truecolor');

/** ScreenState with deterministic dimensions and matching buffers. */
function makeState(
  width: number,
  height: number,
  options: ScreenOptions = {},
): ScreenState {
  const state = createScreenState(options);
  state.width = width;
  state.height = height;
  const size = width * height;
  const cell = (): Cell => ({ char: ' ', bold: false, skip: false });
  state.backBuffer = Array.from({ length: size }, cell);
  state.frontBuffer = Array.from({ length: size }, cell);
  return state;
}

/** Plain text of one back-buffer row. */
function rowText(state: ScreenState, y: number): string {
  return state.backBuffer
    .slice(y * state.width, (y + 1) * state.width)
    .map((c) => c.char || ' ')
    .join('');
}

/** First buffer row whose text contains the needle, or -1. */
function findRow(state: ScreenState, needle: string): number {
  for (let y = 0; y < state.height; y++) {
    if (rowText(state, y).includes(needle)) return y;
  }
  return -1;
}

describe('auto-height direct box geometry (blocker 1)', () => {
  const draw = (ctx: BuntiContext, capture: (sub: BuntiContext) => void) => {
    ctx.box({ width: 56, border: 'rounded', padding: [1, 2] }, (sub) => {
      capture(sub);
      sub.hitbox('row-0', { x: 0, y: 0, width: sub.width, height: 1 });
      for (let i = 0; i < 8; i++) sub.text(`Row ${i}\n`);
      sub.text('footer');
    });
    ctx.flushFlow();
  };

  test('painted border, sub-context offset, and hitbox share one rect', () => {
    const state = makeState(120, 36);
    let sub: BuntiContext | undefined;
    draw(createScreenContext(state), (s) => {
      sub = s;
    });

    // 9 content lines + [1,2] padding + border = 13 rows, centered on 36.
    const borderRow = findRow(state, '╭');
    expect(borderRow).toBe(11);

    // Sub-context rect equals the painted interior (border + padding in).
    expect(sub!.offsetY).toBe(borderRow + 2);
    expect(sub!.offsetX).toBe(32 + 1 + 2);
    expect(sub!.width).toBe(56 - 2 - 4);
    expect(sub!.height).toBe(9);

    // The hitbox registered at sub-context (0,0) sits on the first painted
    // content row — not rows above it (the original bug).
    const firstContentRow = findRow(state, 'Row 0');
    expect(firstContentRow).toBe(borderRow + 2);
    expect(state.hitboxes.get('row-0')).toEqual({
      id: 'row-0',
      x: sub!.offsetX,
      y: firstContentRow,
      width: sub!.width,
      height: 1,
    });
    expect(rowText(state, firstContentRow).indexOf('Row 0')).toBe(sub!.offsetX);
  });

  test('frame 2+: sub-context reports the settled rect DURING the callback', () => {
    const state = makeState(120, 36);
    draw(createScreenContext(state), () => {});

    let duringOffsetY = -1;
    let duringHeight = -1;
    clearBackBuffer(state);
    draw(createScreenContext(state), (s) => {
      duringOffsetY = s.offsetY;
      duringHeight = s.height;
    });

    // Seeded from last frame's measured rect: exact even mid-callback.
    expect(duringOffsetY).toBe(13);
    expect(duringHeight).toBe(9);
  });
});

describe('inline component flow placement (blocker 2a)', () => {
  const drawModalButtons = (
    state: ScreenState,
    onApply: () => void,
    onCancel: () => void,
  ) => {
    const ctx = createScreenContext(state);
    ctx.box(
      { width: 46, height: 9, border: 'double', align: 'center' },
      (m) => {
        Button(m, {
          id: 'apply',
          label: 'Apply',
          variant: 'primary',
          onClick: onApply,
        });
        m.text('   ');
        Button(m, {
          id: 'cancel',
          label: 'Cancel',
          variant: 'ghost',
          onClick: onCancel,
        });
      },
    );
    ctx.flushFlow();
    return ctx;
  };

  test('two inline Buttons register different, non-overlapping rects matching their painted columns', () => {
    const state = makeState(80, 24, { mouse: true });
    drawModalButtons(
      state,
      () => {},
      () => {},
    );

    const apply = state.hitboxes.get('apply')!;
    const cancel = state.hitboxes.get('cancel')!;

    // Regression: these used to be IDENTICAL (both alone-centered).
    expect(apply).not.toEqual({ ...cancel, id: 'apply' });
    expect(apply.y).toBe(cancel.y);
    expect(apply.x + apply.width).toBeLessThanOrEqual(cancel.x);

    // Painted glyphs sit inside their own hitbox columns.
    const line = rowText(state, apply.y);
    const applyCol = line.indexOf('Apply');
    const cancelCol = line.indexOf('Cancel');
    expect(applyCol).toBeGreaterThanOrEqual(apply.x);
    expect(applyCol + 'Apply'.length).toBeLessThanOrEqual(
      apply.x + apply.width,
    );
    expect(cancelCol).toBeGreaterThanOrEqual(cancel.x);
    expect(cancelCol + 'Cancel'.length).toBeLessThanOrEqual(
      cancel.x + cancel.width,
    );
  });

  test('a click on one inline Button fires ONLY that button', () => {
    const state = makeState(80, 24, { mouse: true });
    let applied = 0;
    let cancelled = 0;

    // Frame 1: register + paint.
    drawModalButtons(
      state,
      () => applied++,
      () => cancelled++,
    );
    const apply = state.hitboxes.get('apply')!;

    // Frame 2: synthetic click release inside the Apply pill.
    state.lastKey = 'click';
    state.clickX = apply.x + 1;
    state.clickY = apply.y;
    state.mouseX = apply.x + 1;
    state.mouseY = apply.y;
    drawModalButtons(
      state,
      () => applied++,
      () => cancelled++,
    );

    expect(applied).toBe(1);
    expect(cancelled).toBe(0);
  });
});

describe('overlapping hitboxes: topmost (last-registered) wins (blocker 2b)', () => {
  test('same-frame queries: only the topmost id reports clicked/hovered', () => {
    const state = makeState(40, 10);
    state.lastKey = 'click';
    state.mouseX = 6;
    state.mouseY = 3;
    state.clickX = 6;
    state.clickY = 3;

    const ctx = createScreenContext(state);
    ctx.hitbox('under', { x: 2, y: 2, width: 10, height: 2 });
    ctx.hitbox('over', { x: 4, y: 2, width: 10, height: 2 });

    expect(ctx.isClicked('over')).toBe(true);
    expect(ctx.isClicked('under')).toBe(false);
    expect(ctx.isHovered('over')).toBe(true);
    expect(ctx.isHovered('under')).toBe(false);
  });

  test('hitbox() snapshots: one click fires exactly the topmost across frames', () => {
    const state = makeState(40, 10);

    // Frame 1: register both (no click yet).
    let ctx = createScreenContext(state);
    ctx.hitbox('under', { x: 2, y: 2, width: 10, height: 2 });
    ctx.hitbox('over', { x: 4, y: 2, width: 10, height: 2 });

    // Frame 2: click inside the overlap.
    state.lastKey = 'click';
    state.mouseX = 6;
    state.mouseY = 3;
    state.clickX = 6;
    state.clickY = 3;
    ctx = createScreenContext(state);
    const under = ctx.hitbox('under', { x: 2, y: 2, width: 10, height: 2 });
    const over = ctx.hitbox('over', { x: 4, y: 2, width: 10, height: 2 });

    expect(over.clicked).toBe(true);
    expect(under.clicked).toBe(false);
    expect(over.hovered).toBe(true);
    expect(under.hovered).toBe(false);
    expect(over.pressed).toBe(false); // release frame: button already up
  });
});

describe('Modal entrance keeps hitboxes at settled coordinates (papercut 5)', () => {
  test('hitbox y is identical on frame 1 (sliding) and frame N (settled)', () => {
    const state = makeState(60, 20);
    const props = { width: 30, height: 7, id: 'm' } as const;
    const drawModal = (ctx: BuntiContext) => {
      Modal(ctx, props, (m) => {
        Button(m, { id: 'ok', label: 'OK', variant: 'primary' });
      });
      ctx.flushFlow();
    };

    // Frame 1: entrance progress 0 — the modal PAINTS one row above rest...
    drawModal(createScreenContext(state));
    expect(findRow(state, '╔')).toBe(5); // rest y = 6, slid up 1
    const frame1 = { ...state.hitboxes.get('ok')! };

    // ...then settle and re-render: paint moves down, hitbox must not.
    const record = state.componentState.get('__modal_entrance:m') as {
      openedAt: number;
    };
    record.openedAt = Date.now() - 1000;
    clearBackBuffer(state);
    drawModal(createScreenContext(state));
    expect(findRow(state, '╔')).toBe(6);
    const frameN = { ...state.hitboxes.get('ok')! };

    expect(frame1.y).toBe(frameN.y);
    expect(frame1).toEqual(frameN);

    // The settled paint puts the OK pill on the hitbox row.
    expect(stripAnsi(rowText(state, frameN.y))).toContain('OK');
  });
});
