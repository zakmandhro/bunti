import { describe, expect, test } from 'bun:test';
import { fade, resolveColorToRGB } from '../src/colors';
import {
  Card,
  Link,
  Modal,
  Progress,
  SPINNER_FRAMES,
  Spinner,
} from '../src/components';
import { setColorTier } from '../src/detect';
import { createScreenContext } from '../src/dsl';
import { blit, dimRect, setCell, stripAnsi } from '../src/index';
import { restoreTerminal, updatePointerShape } from '../src/render';
import {
  type Cell,
  clearBackBuffer,
  createScreenState,
  type ScreenOptions,
  type ScreenState,
} from '../src/state';
import { darkTheme } from '../src/theme';

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

function cellAt(state: ScreenState, x: number, y: number): Cell {
  return state.backBuffer[y * state.width + x]!;
}

/** Cell bg normalized to RGB (cells may hold raw values or resolved codes). */
function bgAt(state: ScreenState, x: number, y: number) {
  return resolveColorToRGB(cellAt(state, x, y).bg);
}

function captureStdout(fn: () => void): string[] {
  const writes: string[] = [];
  const original = process.stdout.write;
  (process.stdout as any).write = (chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    (process.stdout as any).write = original;
  }
  return writes;
}

const codeOf = (rgb: { r: number; g: number; b: number }) =>
  `2;${rgb.r};${rgb.g};${rgb.b}`;

describe('dimRect', () => {
  test('scales RGB fg and bg toward black by amount', () => {
    const state = makeState(4, 2);
    setCell(state, 0, 0, {
      char: 'A',
      fg: { r: 200, g: 100, b: 50 },
      bg: { r: 100, g: 100, b: 100 },
    });

    dimRect(state, { x: 0, y: 0, width: 1, height: 1 }, 0.5);

    const cell = cellAt(state, 0, 0);
    expect(cell.fg).toEqual({ r: 100, g: 50, b: 25 });
    expect(cell.bg).toEqual({ r: 50, g: 50, b: 50 });
    expect(cell.fgCode).toBe('2;100;50;25');
    expect(cell.bgCode).toBe('2;50;50;50');
    expect(cell.char).toBe('A');
  });

  test('resolves numeric ANSI-256 codes through the xterm table', () => {
    const state = makeState(4, 2);
    setCell(state, 0, 0, { char: 'X', fg: 196 }); // xterm 196 = #ff0000

    dimRect(state, { x: 0, y: 0, width: 4, height: 2 }, 0.5);

    expect(cellAt(state, 0, 0).fg).toEqual({ r: 128, g: 0, b: 0 });
    expect(cellAt(state, 0, 0).fgCode).toBe('2;128;0;0');
  });

  test('round-trips resolved truecolor code strings', () => {
    const state = makeState(4, 2);
    const cell = cellAt(state, 1, 0);
    cell.bg = '2;100;100;100'; // as rect() stores after resolveColor()
    cell.bgCode = '2;100;100;100';

    dimRect(state, { x: 0, y: 0, width: 4, height: 2 }, 0.25);

    expect(cell.bg).toEqual({ r: 75, g: 75, b: 75 });
  });

  test('leaves undefined bg transparent and undefined fg alone', () => {
    const state = makeState(4, 2);
    setCell(state, 0, 0, { char: 'A', fg: { r: 100, g: 100, b: 100 } });
    setCell(state, 1, 0, { char: 'B', bg: { r: 100, g: 100, b: 100 } });

    dimRect(state, { x: 0, y: 0, width: 4, height: 2 }, 0.5);

    expect(cellAt(state, 0, 0).bg).toBeUndefined();
    expect(cellAt(state, 0, 0).fg).toEqual({ r: 50, g: 50, b: 50 });
    expect(cellAt(state, 1, 0).fg).toBeUndefined();
    expect(cellAt(state, 1, 0).bg).toEqual({ r: 50, g: 50, b: 50 });
  });

  test('dims wide-glyph tail (skip) cells and preserves their skip flag', () => {
    const state = makeState(4, 2);
    const tail = cellAt(state, 1, 0);
    tail.char = '';
    tail.skip = true;
    tail.bg = { r: 200, g: 200, b: 200 };

    dimRect(state, { x: 0, y: 0, width: 4, height: 2 }, 0.5);

    expect(tail.skip).toBe(true);
    expect(tail.bg).toEqual({ r: 100, g: 100, b: 100 });
  });

  test('only touches cells inside the rect; amount 0 is a no-op', () => {
    const state = makeState(4, 2);
    setCell(state, 3, 1, { char: 'Z', bg: { r: 100, g: 100, b: 100 } });

    dimRect(state, { x: 0, y: 0, width: 2, height: 1 }, 0.5);
    expect(cellAt(state, 3, 1).bg).toEqual({ r: 100, g: 100, b: 100 });

    dimRect(state, { x: 0, y: 0, width: 4, height: 2 }, 0);
    expect(cellAt(state, 3, 1).bg).toEqual({ r: 100, g: 100, b: 100 });
  });

  test('is a no-op on the mono tier', () => {
    setColorTier('mono');
    try {
      const state = makeState(4, 2);
      const cell = cellAt(state, 0, 0);
      cell.bg = { r: 100, g: 100, b: 100 };

      dimRect(state, { x: 0, y: 0, width: 4, height: 2 }, 0.5);
      expect(cell.bg).toEqual({ r: 100, g: 100, b: 100 });
    } finally {
      setColorTier('truecolor');
    }
  });
});

describe('layer backdrop + shadow compositing', () => {
  const gray = { r: 100, g: 100, b: 100 };

  test('backdrop dims everything below; layer content lands full-strength', () => {
    const state = makeState(40, 12);
    const ctx = createScreenContext(state);
    ctx.rect(0, 0, 40, 12, { char: ' ', bg: gray });
    ctx.layer({ zIndex: 5, backdrop: 0.5 }, (l) => {
      l.rect(10, 3, 10, 4, { char: ' ', bg: { r: 200, g: 200, b: 200 } });
    });
    ctx.flushFlow();

    // Far from the layer: dimmed by the backdrop (100 * 0.5).
    expect(bgAt(state, 0, 0)).toEqual({ r: 50, g: 50, b: 50 });
    // Under the layer's content: composited at full strength.
    expect(bgAt(state, 10, 3)).toEqual({ r: 200, g: 200, b: 200 });
  });

  test('shadow dims a +2/+1 offset rect under the painted bounds', () => {
    const state = makeState(40, 12);
    const ctx = createScreenContext(state);
    ctx.rect(0, 0, 40, 12, { char: ' ', bg: gray });
    ctx.layer({ zIndex: 1, shadow: true }, (l) => {
      l.rect(10, 3, 10, 4, { char: ' ', bg: { r: 220, g: 220, b: 220 } });
    });
    ctx.flushFlow();

    // Bounds (10,3,10x4) -> shadow rect (12,4,10x4). Exposed corner:
    expect(bgAt(state, 21, 7)).toEqual({ r: 55, g: 55, b: 55 }); // 100*0.55
    // Just outside the shadow: untouched.
    expect(bgAt(state, 22, 8)).toEqual(gray);
    expect(bgAt(state, 9, 3)).toEqual(gray);
    // Cells covered by the layer content are overwritten, not shadowed.
    expect(bgAt(state, 12, 4)).toEqual({ r: 220, g: 220, b: 220 });
  });

  test('backdrop and shadow respect z-order regardless of declaration order', () => {
    const state = makeState(40, 12);
    const ctx = createScreenContext(state);

    // Declared FIRST but composites LAST (z 10).
    ctx.layer({ zIndex: 10, backdrop: 0.5, shadow: true }, (l) => {
      l.rect(20, 5, 8, 3, { char: ' ', bg: { r: 240, g: 240, b: 240 } });
    });
    // Declared second, composites first (z 1). One cell sits inside the
    // upper layer's exposed shadow row (shadow rect 22,6,8x3; row 8 is
    // not covered by the upper content at rows 5-7).
    ctx.layer({ zIndex: 1 }, (l) => {
      l.rect(0, 0, 4, 1, { char: ' ', bg: { r: 200, g: 100, b: 60 } });
      l.rect(25, 8, 1, 1, { char: ' ', bg: { r: 200, g: 200, b: 200 } });
    });
    ctx.flushFlow();

    // Lower layer content was dimmed by the upper layer's backdrop.
    expect(bgAt(state, 0, 0)).toEqual({ r: 100, g: 50, b: 30 });
    // Lower layer content under the upper shadow: backdrop THEN shadow
    // (200 * 0.5 = 100, then * 0.55 = 55).
    expect(bgAt(state, 25, 8)).toEqual({ r: 55, g: 55, b: 55 });
    // Upper layer content is never dimmed by its own backdrop/shadow.
    expect(bgAt(state, 20, 5)).toEqual({ r: 240, g: 240, b: 240 });
  });
});

describe('Modal', () => {
  test('renders via a layer with backdrop and themed raised surface', () => {
    const state = makeState(60, 20);
    const ctx = createScreenContext(state);
    ctx.rect(0, 0, 60, 20, { char: ' ', bg: { r: 100, g: 100, b: 100 } });
    // Pre-settle the entrance so the final visual state renders.
    state.componentState.set('__modal_entrance:m1', {
      openedAt: Date.now() - 1000,
      lastSeen: Date.now(),
    });

    Modal(ctx, { width: 20, height: 6, id: 'm1' }, (sub) => {
      sub.text('Hello');
    });
    ctx.flushFlow();

    // Default backdrop 0.55 dims the screen below (100 * 0.45 = 45).
    expect(bgAt(state, 0, 0)).toEqual({ r: 45, g: 45, b: 45 });
    // Modal surface uses theme.surfaceRaised. Modal rests at (20,7)-(39,12).
    expect(cellAt(state, 25, 9).bgCode).toBe(
      codeOf(darkTheme.surfaceRaised.rgb),
    );
    // Default shadow: exposed offset cell below-right of the modal
    // (bounds 20,7 20x6 -> shadow 22,8 20x6; row 13 is exposed).
    expect(bgAt(state, 30, 13)).toEqual({ r: 25, g: 25, b: 25 }); // 45*0.55
  });

  test('props can disable backdrop and shadow', () => {
    const state = makeState(60, 20);
    const ctx = createScreenContext(state);
    ctx.rect(0, 0, 60, 20, { char: ' ', bg: { r: 100, g: 100, b: 100 } });
    state.componentState.set('__modal_entrance:m2', {
      openedAt: Date.now() - 1000,
      lastSeen: Date.now(),
    });

    Modal(
      ctx,
      { width: 20, height: 6, id: 'm2', backdrop: false, shadow: false },
      () => {},
    );
    ctx.flushFlow();

    expect(bgAt(state, 0, 0)).toEqual({ r: 100, g: 100, b: 100 });
    expect(bgAt(state, 30, 13)).toEqual({ r: 100, g: 100, b: 100 });
  });

  test('entrance starts one row up and slides to rest', () => {
    const state = makeState(60, 20);
    const props = {
      width: 20,
      height: 6,
      id: 'slide',
      backdrop: false as const,
      shadow: false,
    };

    // Frame 1 (freshly opened): progress 0 -> one row above rest.
    let ctx = createScreenContext(state);
    Modal(ctx, props, () => {});
    ctx.flushFlow();
    expect(cellAt(state, 20, 6).char).toBe('╔'); // rest is y=7

    // Settle the entrance, re-render: modal rests at y=7.
    const record = state.componentState.get('__modal_entrance:slide') as {
      openedAt: number;
    };
    record.openedAt = Date.now() - 1000;
    clearBackBuffer(state);
    ctx = createScreenContext(state);
    Modal(ctx, props, () => {});
    ctx.flushFlow();
    expect(cellAt(state, 20, 7).char).toBe('╔');
    expect(cellAt(state, 20, 6).char).toBe(' ');
  });

  test('entrance fades the surface from background toward surfaceRaised', () => {
    const state = makeState(60, 20);
    const props = {
      width: 20,
      height: 6,
      id: 'fade',
      backdrop: false as const,
      shadow: false,
    };

    let ctx = createScreenContext(state);
    Modal(ctx, props, () => {});
    ctx.flushFlow();
    // progress 0: the surface matches the theme background exactly.
    expect(cellAt(state, 25, 8).bgCode).toBe(codeOf(darkTheme.background.rgb));

    const record = state.componentState.get('__modal_entrance:fade') as {
      openedAt: number;
    };
    record.openedAt = Date.now() - 1000;
    clearBackBuffer(state);
    ctx = createScreenContext(state);
    Modal(ctx, props, () => {});
    ctx.flushFlow();
    expect(cellAt(state, 25, 9).bgCode).toBe(
      codeOf(darkTheme.surfaceRaised.rgb),
    );
  });
});

describe('Spinner', () => {
  test('advances braille frames with elapsed time', () => {
    const state = createScreenState();

    state.startTime = Date.now() - 40; // mid frame 0
    let ctx = createScreenContext(state);
    expect(stripAnsi(Spinner(ctx, { label: 'Loading' }))).toBe(
      `${SPINNER_FRAMES[0]} Loading`,
    );

    state.startTime = Date.now() - 120; // mid frame 1
    ctx = createScreenContext(state);
    expect(stripAnsi(Spinner(ctx))).toBe(SPINNER_FRAMES[1]!);

    state.startTime = Date.now() - (80 * 10 + 40); // wraps to frame 0
    ctx = createScreenContext(state);
    expect(stripAnsi(Spinner(ctx))).toBe(SPINNER_FRAMES[0]!);
  });

  test('respects a custom frame interval and colors via theme.accent', () => {
    const state = createScreenState();
    state.startTime = Date.now() - 250; // frame 1 at 200ms/frame
    const ctx = createScreenContext(state);
    const out = Spinner(ctx, { intervalMs: 200 });
    expect(stripAnsi(out)).toBe(SPINNER_FRAMES[1]!);
    expect(out).toContain(codeOf(darkTheme.accent.rgb));
  });
});

describe('Progress', () => {
  test('fills by value with rounding and clamping', () => {
    const state = createScreenState();
    expect(
      stripAnsi(
        Progress(createScreenContext(state), { value: 0.5, width: 10 }),
      ),
    ).toBe('█████░░░░░');
    expect(
      stripAnsi(Progress(createScreenContext(state), { value: 2, width: 4 })),
    ).toBe('████');
    expect(
      stripAnsi(Progress(createScreenContext(state), { value: -1, width: 4 })),
    ).toBe('░░░░');
    expect(
      stripAnsi(
        Progress(createScreenContext(state), {
          value: 0.25,
          width: 8,
          showPercent: true,
        }),
      ),
    ).toBe('██░░░░░░  25%');
  });

  test('uses theme.primary fill and theme.border track by default', () => {
    const state = createScreenState();
    const out = Progress(createScreenContext(state), {
      value: 0.5,
      width: 4,
    });
    expect(out).toContain(codeOf(darkTheme.primary.rgb));
    expect(out).toContain(codeOf(darkTheme.border.rgb));
  });

  test('gradient fill spans the full bar per-cell', () => {
    const state = createScreenState();
    const out = Progress(createScreenContext(state), {
      value: 1,
      width: 4,
      gradient: ['#ff0000', '#0000ff'],
    });
    expect(stripAnsi(out)).toBe('████');
    expect(out).toContain('38;2;255;0;0'); // first stop
    expect(out).toContain('38;2;0;0;255'); // last stop
  });
});

describe('Link', () => {
  test('renders underlined text and registers a pointer-friendly hitbox', () => {
    const state = createScreenState({ mouse: true });
    const ctx = createScreenContext(state);
    const styled = Link(ctx, { id: 'docs', label: 'Read docs' });

    expect(styled).toContain('\x1b[4m');
    expect(stripAnsi(styled)).toBe('Read docs');
    expect(state.hitboxes.get('docs')).toEqual({
      id: 'docs',
      x: 0,
      y: 0,
      width: 9,
      height: 1,
    });
  });

  test('hover brightens the color; click fires once via the hitbox', () => {
    const state = createScreenState({ mouse: true });
    state.mouseX = 2;
    state.mouseY = 0;
    state.lastKey = 'click';
    state.clickX = 2;
    state.clickY = 0;

    let clicks = 0;
    const ctx = createScreenContext(state);
    const styled = Link(ctx, {
      id: 'docs',
      label: 'Read docs',
      color: { r: 100, g: 100, b: 200 },
      onClick: () => {
        clicks += 1;
      },
    });

    expect(clicks).toBe(1);
    // Dark mode hover: +25% brightness.
    expect(styled).toContain('38;2;125;125;250');
  });

  test('underline survives the blit round-trip into cells', () => {
    const state = makeState(10, 2);
    blit(state, 0, 0, '\x1b[4mAB\x1b[24mC');

    expect(cellAt(state, 0, 0).underline).toBe(true);
    expect(cellAt(state, 1, 0).underline).toBe(true);
    expect(cellAt(state, 2, 0).underline ?? false).toBe(false);
  });
});

describe('Card hover', () => {
  const props = { x: 5, y: 3, width: 30, height: 10, title: 'Stats' };

  test('without an id no hitbox is registered (unchanged behavior)', () => {
    const state = makeState(60, 20, { mouse: true });
    const ctx = createScreenContext(state);
    Card(ctx, props, (sub) => sub.text('hello'));
    expect(state.hitboxes.size).toBe(0);
  });

  test('with an id, hover lifts the border to theme.focus', () => {
    const state = makeState(60, 20, { mouse: true });
    state.mouseX = 12;
    state.mouseY = 6;

    // Frame 1 registers the hitbox (hover styling reads the previous frame).
    let ctx = createScreenContext(state);
    Card(ctx, { ...props, id: 'card' }, (sub) => sub.text('hello'));
    expect(state.hitboxes.get('card')).toEqual({
      id: 'card',
      x: 5,
      y: 3,
      width: 30,
      height: 10,
    });
    expect(state.hoverStates.get('card')).toBe(true);

    // Frame 2 renders the hover affordance.
    clearBackBuffer(state);
    ctx = createScreenContext(state);
    Card(ctx, { ...props, id: 'card' }, (sub) => sub.text('hello'));
    expect(cellAt(state, 5, 3).fgCode).toBe(codeOf(darkTheme.focus.rgb));
    // Hover bg shifts one step (theme.surface when the card had no bg).
    expect(cellAt(state, 12, 6).bgCode).toBe(codeOf(darkTheme.surface.rgb));

    // Frame 3 with the mouse away: back to the default border.
    state.mouseX = 55;
    state.mouseY = 19;
    ctx = createScreenContext(state);
    Card(ctx, { ...props, id: 'card' }, (sub) => sub.text('hello'));
    clearBackBuffer(state);
    ctx = createScreenContext(state);
    Card(ctx, { ...props, id: 'card' }, (sub) => sub.text('hello'));
    expect(cellAt(state, 5, 3).fgCode).toBe(codeOf(darkTheme.border.rgb));
  });
});

describe('list row hitboxes', () => {
  test('rows register hitboxes; clicking selects and focuses the list', () => {
    const state = makeState(40, 10, { mouse: true });
    state.mouseX = 3;
    state.mouseY = 2;
    state.lastKey = 'click';
    state.clickX = 3;
    state.clickY = 2;

    const ctx = createScreenContext(state);
    ctx.list('fleet', ['Earth', 'Mars', 'Venus'], { width: '100%' });

    expect(state.hitboxes.get('fleet:row:0')).toEqual({
      id: 'fleet:row:0',
      x: 0,
      y: 0,
      width: 40,
      height: 1,
    });
    expect(state.hitboxes.get('fleet:row:2')).toBeDefined();
    expect(state.componentState.get('fleet_index')).toBe(2);
    expect(state.focusedId).toBe('fleet');
  });

  test('hovered row gets a soft selection wash; selection keeps full bg', () => {
    const state = makeState(40, 10, { mouse: true });
    state.mouseX = 1;
    state.mouseY = 1; // hovering row 1; row 0 is selected

    const ctx = createScreenContext(state);
    ctx.list('fleet', ['Earth', 'Mars', 'Venus'], { width: '100%' });
    ctx.flushFlow();

    const wash = fade(darkTheme.selection.rgb, darkTheme.background.rgb, 0.55);
    expect(cellAt(state, 0, 1).bg).toEqual(wash);
    expect(cellAt(state, 0, 0).bg).toEqual(darkTheme.selection.rgb);
    expect(cellAt(state, 0, 2).bg).toBeUndefined();
  });

  test('no mouse option means no row hitboxes (keyboard-only unchanged)', () => {
    const state = makeState(40, 10);
    const ctx = createScreenContext(state);
    ctx.list('fleet', ['Earth', 'Mars'], { width: '100%' });
    expect(state.hitboxes.size).toBe(0);
  });
});

describe('OSC 22 pointer cursor', () => {
  const HOVER_BOX = { id: 'btn', x: 0, y: 0, width: 5, height: 1 };

  test('emits pointer once on hover edge and default on unhover edge', () => {
    const state = createScreenState({ mouse: true });
    state.terminal = { ...state.terminal!, app: 'ghostty' };
    state.hitboxes.set('btn', HOVER_BOX);
    state.mouseX = 2;
    state.mouseY = 0;

    const enter = captureStdout(() => {
      updatePointerShape(state);
      updatePointerShape(state); // same state: no re-emit
    });
    expect(enter).toEqual(['\x1b]22;pointer\x1b\\']);

    state.mouseX = 20;
    const leave = captureStdout(() => {
      updatePointerShape(state);
      updatePointerShape(state);
    });
    expect(leave).toEqual(['\x1b]22;default\x1b\\']);
  });

  test('never emits for apple-terminal or mouse-less screens', () => {
    const apple = createScreenState({ mouse: true });
    apple.terminal = { ...apple.terminal!, app: 'apple-terminal' };
    apple.hitboxes.set('btn', HOVER_BOX);
    apple.mouseX = 2;
    apple.mouseY = 0;
    expect(captureStdout(() => updatePointerShape(apple))).toEqual([]);

    const noMouse = createScreenState();
    noMouse.terminal = { ...noMouse.terminal!, app: 'ghostty' };
    noMouse.hitboxes.set('btn', HOVER_BOX);
    noMouse.mouseX = 2;
    noMouse.mouseY = 0;
    expect(captureStdout(() => updatePointerShape(noMouse))).toEqual([]);
  });

  test('restoreTerminal resets an active pointer shape', () => {
    const state = createScreenState();
    state.pointerShape = 'pointer';
    const writes = captureStdout(() => restoreTerminal(state));
    expect(writes.join('')).toContain('\x1b]22;default\x1b\\');
    expect(state.pointerShape).toBe('default');
  });
});
