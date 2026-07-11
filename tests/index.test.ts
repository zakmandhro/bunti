import { describe, expect, test } from 'bun:test';
import { Box, Button, Card, Input } from '../src/components';
import { setColorTier } from '../src/detect';
import { createScreenContext } from '../src/dsl';
import {
  blit,
  box,
  createGradient,
  fade,
  joinHorizontal,
  list,
  splitRect,
  stripAnsi,
  truncate,
  visibleWidth,
} from '../src/index';
import { createKeyEvent } from '../src/input';
import {
  applyInputToState,
  isResizeSettled,
  syncScreenSize,
} from '../src/render';
import { createScreenState, resizeScreen } from '../src/state';
import { darkTheme, lightTheme } from '../src/theme';
import { colors as pc } from '../src/vendor/colors';

// Pin the color tier so expectations don't depend on the host terminal env.
setColorTier('truecolor');

describe('Bunti Core Engine', () => {
  test('stripAnsi removes color codes', () => {
    const colored = `${pc.red('hello')} ${pc.blue('world')}`;
    expect(stripAnsi(colored)).toBe('hello world');
  });

  test('visibleWidth calculates correct length', () => {
    const colored = `${pc.bold(pc.green('✓'))} Done`;
    expect(visibleWidth(colored)).toBe(6);
  });

  test('fade interpolates colors and clamps progress', () => {
    expect(fade('black', 'white', 0.5)).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
    expect(fade('#000000', '#ffffff', -1)).toEqual({ r: 0, g: 0, b: 0 });
    expect(fade('#000000', '#ffffff', 2)).toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
  });

  test('context exposes fade for animation colors', () => {
    const ctx = createScreenContext(createScreenState());

    expect(ctx.fade('red', 'green', 0.25)).toEqual({
      r: 163,
      g: 88,
      b: 50,
    });
  });

  test('typewriter reveals text over time with a block cursor', () => {
    const state = createScreenState();
    state.startTime = Date.now() - 5200;
    const ctx = createScreenContext(state);

    expect(ctx.typewriter('hello world', { cps: 1 })).toEqual({
      text: 'hello',
      cursor: '█',
      done: false,
      index: 5,
      progress: 5 / 11,
    });
  });

  test('typewriter slices wide emoji by grapheme', () => {
    const state = createScreenState();
    state.startTime = Date.now() - 1200;
    const ctx = createScreenContext(state);

    const typed = ctx.typewriter('🍭abc', { cps: 1 });

    expect(typed.text).toBe('🍭');
    expect(visibleWidth(typed.text)).toBe(2);
  });

  test('blit marks trailing cells for wide emoji graphemes', () => {
    const state = createScreenState();
    state.width = 10;
    state.height = 2;

    blit(state, 0, 0, '🍭X');

    expect(visibleWidth('🍭')).toBe(2);
    expect(state.backBuffer[0]?.char).toBe('🍭');
    expect(state.backBuffer[1]?.skip).toBe(true);
    expect(state.backBuffer[1]?.char).toBe('');
    expect(state.backBuffer[2]?.char).toBe('X');
  });

  test('blit clears inherited foreground when writing plain text', () => {
    const state = createScreenState();
    state.width = 10;
    state.height = 2;

    blit(state, 0, 0, '█', {
      fg: { r: 255, g: 0, b: 255 },
      bg: { r: 10, g: 10, b: 10 },
    });
    blit(state, 0, 0, 'A');

    expect(state.backBuffer[0]?.char).toBe('A');
    expect(state.backBuffer[0]?.fg).toBeUndefined();
    expect(state.backBuffer[0]?.fgCode).toBeUndefined();
    expect(state.backBuffer[0]?.bg).toEqual({ r: 10, g: 10, b: 10 });
  });

  test('blit applies configured default foreground to plain text', () => {
    const state = createScreenState({ defaultFg: 'silver' });
    state.width = 10;
    state.height = 2;

    blit(state, 0, 0, 'A\x1b[31mB\x1b[39m');

    expect(state.backBuffer[0]?.fg).toBe('silver');
    expect(state.backBuffer[1]?.fg).toBe('1');
  });

  test('box adds correct padding', () => {
    const b = box('hi', { padding: [0, 2] });
    expect(visibleWidth(b.split('\n')[0] ?? '')).toBe(6); // "  hi  "
  });

  test('box renders title in bordered top edge', () => {
    const b = box('hi', { width: 14, border: 'default', title: 'Title' });
    expect(stripAnsi(b.split('\n')[0] ?? '')).toBe('┌─ Title ────┐');
  });

  test('box preserves intentional leading spaces', () => {
    const b = box('  indented', { align: 'left' });
    expect(b).toStartWith('  indented');
  });

  test('joinHorizontal aligns blocks correctly', () => {
    const b1 = box('left', { width: 10 });
    const b2 = box('right', { width: 10 });
    const joined = joinHorizontal(b1, b2);
    const lines = joined.split('\n');
    expect(visibleWidth(lines[0] ?? '')).toBe(20);
  });

  test('truncate respects visible width and preserves ANSI', () => {
    const colored = '\x1b[31msupercalifragilistic\x1b[39m';
    const truncated = truncate(colored, 10);
    expect(visibleWidth(truncated)).toBe(10);
    expect(truncated).toContain('\x1b[31m'); // Should still have red code
  });

  test('list renders items with bullets and indentation', () => {
    const items = ['one', 'two'];
    const out = list(items, { bullet: '- ', indent: 2 });
    expect(out).toBe('  - one\n  - two');
  });

  test('list renders selected row background without marker characters', () => {
    const out = list(['one', 'two'], {
      focusedIndex: 1,
      selectedBg: 238,
      width: 8,
    });
    const lines = out.split('\n');

    expect(stripAnsi(lines[1] ?? '')).toBe('two     ');
    expect(lines[1]).toContain('\x1b[48;5;238m');
  });

  test('list preserves selected background across nested color resets', () => {
    const out = list([pc.green('ok')], {
      focusedIndex: 0,
      selectedBg: 236,
      width: 6,
    });

    expect(stripAnsi(out)).toBe('ok    ');
    expect(out).toContain('\x1b[48;5;236m');
  });

  test('context list responds to normalized arrow keys', () => {
    const state = createScreenState();
    state.focusedId = 'items';
    state.lastKey = 'down';

    const ctx = createScreenContext(state);
    ctx.list('items', ['one', 'two', 'three']);

    expect(state.componentState.get('items_index')).toBe(1);
  });

  test('tab cycles focus using previous frame focusables', () => {
    const state = createScreenState();

    let ctx = createScreenContext(state);
    ctx.list('one', ['alpha']);
    ctx.list('two', ['beta']);
    expect(state.focusedId).toBe('one');

    state.lastKey = 'tab';
    ctx = createScreenContext(state);
    ctx.list('one', ['alpha']);
    ctx.list('two', ['beta']);

    expect(state.focusedId).toBe('two');
  });

  test('context hitbox registers relative interactive geometry', () => {
    const state = createScreenState();
    state.mouseX = 12;
    state.mouseY = 4;

    const ctx = createScreenContext(state);
    const result = ctx.hitbox('control', {
      x: 10,
      y: 3,
      width: 5,
      height: 2,
    });

    expect(result.hovered).toBe(true);
    expect(ctx.isHovered('control')).toBe(true);
    expect(state.hitboxes.get('control')).toEqual({
      id: 'control',
      x: 10,
      y: 3,
      width: 5,
      height: 2,
    });
  });

  test('context hitbox reports pressed and clicked states centrally', () => {
    const state = createScreenState();
    state.mouseX = 2;
    state.mouseY = 1;
    state.mouseButton = 0;
    state.isMouseDown = true;
    state.lastKey = 'click';

    const ctx = createScreenContext(state);
    const result = ctx.hitbox('control', {
      x: 0,
      y: 0,
      width: 4,
      height: 2,
    });

    expect(result.pressed).toBe(true);
    expect(result.clicked).toBe(true);
    expect(ctx.isPressed('control')).toBe(true);
    expect(ctx.isClicked('control')).toBe(true);
  });

  test('context resolves component rects from parent-relative sizes', () => {
    const state = createScreenState();
    state.width = 80;
    state.height = 20;

    const ctx = createScreenContext(state);
    const rect = ctx.resolveRect({
      x: 4,
      y: 2,
      width: '50%',
      height: 3,
    });

    expect(rect).toEqual({ x: 4, y: 2, width: 40, height: 3 });
  });

  test('context resolves local placed rects for component layout', () => {
    const state = createScreenState();
    state.width = 80;
    state.height = 20;

    const ctx = createScreenContext(state);
    const rect = ctx.resolveLocalRect({
      y: 4,
      width: 20,
      height: 3,
    });

    expect(rect).toEqual({ x: 30, y: 4, width: 20, height: 3 });
  });

  test('context resolves right and bottom aligned local rects', () => {
    const state = createScreenState();
    state.width = 80;
    state.height = 20;

    const ctx = createScreenContext(state);
    const rect = ctx.resolveLocalRect(
      {
        width: 20,
        height: 3,
      },
      { defaultX: 'right', defaultY: 'bottom' },
    );

    expect(rect).toEqual({ x: 60, y: 17, width: 20, height: 3 });
  });

  test('splitRect creates responsive tracks with fixed percent and fill sizes', () => {
    const areas = splitRect(
      { x: 0, y: 0, width: 100, height: 20 },
      {
        direction: 'horizontal',
        constraints: [20, '50%', '1fr'],
        gap: 2,
      },
    );

    expect(areas).toEqual([
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 22, y: 0, width: 48, height: 20 },
      { x: 72, y: 0, width: 28, height: 20 },
    ]);
  });

  test('context split returns local layout rects', () => {
    const state = createScreenState();
    state.width = 80;
    state.height = 20;

    const ctx = createScreenContext(state);
    const [left, right] = ctx.split({
      direction: 'horizontal',
      constraints: ['1fr', '1fr'],
      gap: 4,
    });

    expect(left).toEqual({ x: 0, y: 0, width: 38, height: 20 });
    expect(right).toEqual({ x: 42, y: 0, width: 38, height: 20 });
  });

  test('Box component renders through the shared context box path', () => {
    const state = createScreenState();
    state.width = 20;
    state.height = 6;

    const ctx = createScreenContext(state);
    Box(ctx, { width: 10, height: 3, border: 'rounded' }, ({ text }) => {
      text('ok');
    });

    expect(state.backBuffer[25]?.char).toBe('╭');
  });

  test('keyboard input is normalized and requests an immediate rerender', () => {
    const state = createScreenState();
    let ticks = 0;
    (state as { requestTick?: () => void }).requestTick = () => ticks++;

    applyInputToState(state, '\x1b[A');
    expect(state.lastKey).toBe('up');
    expect(ticks).toBe(1);

    applyInputToState(state, '\t');
    expect(state.lastKey).toBe('tab');
    expect(ticks).toBe(2);

    applyInputToState(state, 'x');
    expect(state.lastKey).toBe('x');
    expect(ticks).toBe(3);
  });

  // Click semantics changed with the input tokenizer: a press only records
  // state; 'click' is emitted ONCE on SGR release, at the press-origin
  // coordinates (previously it fired on press, repeating while held).
  test('mouse press tracks SGR coordinates; click emits once on release', () => {
    const state = createScreenState();
    let ticks = 0;
    (state as { requestTick?: () => void }).requestTick = () => ticks++;

    applyInputToState(state, '\x1b[<0;10;5M');

    expect(state.mouseButton).toBe(0);
    expect(state.mouseX).toBe(9);
    expect(state.mouseY).toBe(4);
    expect(state.isMouseDown).toBe(true);
    expect(state.lastKey).toBeUndefined(); // no click on press anymore
    expect(ticks).toBe(1);

    // Release elsewhere: click carries the press-origin coordinates.
    applyInputToState(state, '\x1b[<0;12;6m');

    expect(state.isMouseDown).toBe(false);
    expect(state.lastKey).toBe('click');
    expect(state.clickX).toBe(9);
    expect(state.clickY).toBe(4);
    expect(ticks).toBe(2);
  });

  test('mouse movement requests an immediate rerender without click state', () => {
    const state = createScreenState();
    let ticks = 0;
    (state as { requestTick?: () => void }).requestTick = () => ticks++;

    applyInputToState(state, '\x1b[<35;12;6m');

    expect(state.mouseX).toBe(11);
    expect(state.mouseY).toBe(5);
    expect(state.isMouseDown).toBe(false);
    expect(state.lastKey).toBeUndefined();
    expect(ticks).toBe(1);
  });

  test('focus events update throttling state and restart the render loop', () => {
    const state = createScreenState();
    let restarts = 0;
    (state as { restartLoop?: () => void }).restartLoop = () => restarts++;

    applyInputToState(state, '\x1b[O');
    expect(state.hasFocus).toBe(false);
    expect(restarts).toBe(1);

    applyInputToState(state, '\x1b[I');
    expect(state.hasFocus).toBe(true);
    expect(restarts).toBe(2);
  });

  test('resizeScreen rebuilds buffers for the current terminal dimensions', () => {
    const columns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    const rows = Object.getOwnPropertyDescriptor(process.stdout, 'rows');

    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 42,
    });
    Object.defineProperty(process.stdout, 'rows', {
      configurable: true,
      value: 11,
    });

    try {
      const state = createScreenState();
      resizeScreen(state);

      expect(state.width).toBe(42);
      expect(state.height).toBe(11);
      expect(state.frontBuffer).toHaveLength(42 * 11);
      expect(state.backBuffer).toHaveLength(42 * 11);
      expect(state.needsFullRedraw).toBe(true);
      expect(state.isResizing).toBe(true);
      expect(state.resizeSettlesAt).toBeGreaterThan(Date.now());
    } finally {
      if (columns) Object.defineProperty(process.stdout, 'columns', columns);
      else delete (process.stdout as { columns?: number }).columns;
      if (rows) Object.defineProperty(process.stdout, 'rows', rows);
      else delete (process.stdout as { rows?: number }).rows;
    }
  });

  test('syncScreenSize rebuilds buffers when terminal dimensions drift', () => {
    const columns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    const rows = Object.getOwnPropertyDescriptor(process.stdout, 'rows');

    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 80,
    });
    Object.defineProperty(process.stdout, 'rows', {
      configurable: true,
      value: 24,
    });

    try {
      const state = createScreenState();

      Object.defineProperty(process.stdout, 'columns', {
        configurable: true,
        value: 51,
      });
      Object.defineProperty(process.stdout, 'rows', {
        configurable: true,
        value: 13,
      });

      const resized = syncScreenSize(state);

      expect(resized).toBe(true);
      expect(state.width).toBe(51);
      expect(state.height).toBe(13);
      expect(state.frontBuffer).toHaveLength(51 * 13);
      expect(state.backBuffer).toHaveLength(51 * 13);
      expect(state.needsFullRedraw).toBe(true);
    } finally {
      if (columns) Object.defineProperty(process.stdout, 'columns', columns);
      else delete (process.stdout as { columns?: number }).columns;
      if (rows) Object.defineProperty(process.stdout, 'rows', rows);
      else delete (process.stdout as { rows?: number }).rows;
    }
  });

  test('isResizeSettled waits until the resize debounce window passes', () => {
    const state = createScreenState({ resizeDebounceMs: 250 });
    resizeScreen(state);

    expect(isResizeSettled(state, state.resizeSettlesAt! - 1)).toBe(false);
    expect(isResizeSettled(state, state.resizeSettlesAt!)).toBe(true);
  });

  // Input now consumes the KeyEvent frame queue (state.keys) instead of the
  // legacy lastKey slot, so modifier combos are distinguishable.
  test('Input updates managed state from normalized keyboard input', () => {
    const state = createScreenState();
    state.focusedId = 'mission';
    state.keys = [createKeyEvent('a')];

    const ctx = createScreenContext(state);
    Input(ctx, { id: 'mission', width: 20 });

    expect(state.componentState.get('mission')).toBe('a');
  });

  test('Input full-width sizing shares render and hitbox geometry', () => {
    const state = createScreenState();
    state.width = 64;

    const ctx = createScreenContext(state);
    Input(ctx, { id: 'mission', width: '100%' });
    ctx.flushFlow();

    expect(state.hitboxes.get('mission')).toEqual({
      id: 'mission',
      x: 0,
      y: 0,
      width: 64,
      height: 3,
    });

    const topBorderWidth = visibleWidth(
      state.backBuffer
        .slice(0, state.width)
        .map((cell) => cell.char)
        .join(''),
    );
    expect(topBorderWidth).toBe(64);
  });

  test('Input centered sizing shares render and hitbox geometry', () => {
    const state = createScreenState();
    state.width = 80;

    const ctx = createScreenContext(state);
    Input(ctx, { id: 'mission', width: 20 });
    ctx.flushFlow();

    expect(state.hitboxes.get('mission')).toEqual({
      id: 'mission',
      x: 30,
      y: 0,
      width: 20,
      height: 3,
    });
    expect(state.backBuffer[30]?.char).toBe('╭');
  });

  test('Input nested in a Box renders at the same rect as its hitbox', () => {
    const state = createScreenState();
    state.width = 80;
    state.height = 20;

    const ctx = createScreenContext(state);
    Box(
      ctx,
      { x: 10, y: 2, width: 40, height: 7, border: 'rounded', align: 'left' },
      (sub) => {
        Input(sub, { id: 'mission', width: 20 });
      },
    );

    expect(state.hitboxes.get('mission')).toEqual({
      id: 'mission',
      x: 20,
      y: 3,
      width: 20,
      height: 3,
    });
    expect(state.backBuffer[3 * state.width + 20]?.char).toBe('╭');
  });

  test('Input renders placeholder muted and typed value bright', () => {
    const placeholderState = createScreenState();
    let ctx = createScreenContext(placeholderState);
    Input(ctx, {
      id: 'mission',
      label: 'MISSION:',
      placeholder: 'Enter mission name...',
      width: 40,
    });
    ctx.flushFlow();
    const placeholderFg = placeholderState.backBuffer.find(
      (cell) => cell.char === 'E',
    )?.fgCode;

    const valueState = createScreenState();
    valueState.focusedId = 'mission';
    valueState.componentState.set('mission', 'Alpha');
    ctx = createScreenContext(valueState);
    Input(ctx, { id: 'mission', label: 'MISSION:', width: 40 });
    ctx.flushFlow();
    const valueFg = valueState.backBuffer.find(
      (cell) => cell.char === 'A',
    )?.fgCode;

    // Input colors now derive from theme tokens (placeholder -> muted,
    // value -> foreground) instead of the old hardcoded ash/white codes.
    const muted = darkTheme.muted.rgb;
    const fgTok = darkTheme.foreground.rgb;
    expect(String(placeholderFg)).toBe(`2;${muted.r};${muted.g};${muted.b}`);
    expect(String(valueFg)).toBe(`2;${fgTok.r};${fgTok.g};${fgTok.b}`);
  });

  test('Button invokes onClick from keyboard activation and mouse clicks', () => {
    const state = createScreenState();
    state.width = 80;
    state.focusedId = 'deploy';
    state.lastKey = 'enter';

    let clicks = 0;
    let ctx = createScreenContext(state);
    Button(ctx, {
      id: 'deploy',
      label: 'DEPLOY',
      onClick: () => clicks++,
    });
    expect(clicks).toBe(1);

    state.lastKey = 'click';
    state.mouseButton = 0;
    state.isMouseDown = true;
    state.mouseX = 34;
    state.mouseY = 0;

    ctx = createScreenContext(state);
    Button(ctx, {
      id: 'abort',
      label: 'ABORT',
      onClick: () => clicks++,
    });

    expect(clicks).toBe(2);
  });

  test('Button hover state changes primary pill color', () => {
    const idleState = createScreenState();
    idleState.width = 80;
    idleState.focusedId = 'other';
    let ctx = createScreenContext(idleState);
    Button(ctx, {
      id: 'deploy',
      label: 'Deploy',
      variant: 'primary',
      width: 16,
    });
    const idleFg = idleState.backBuffer.find(
      (cell) => cell.char === '',
    )?.fgCode;

    const hoverState = createScreenState();
    hoverState.width = 80;
    hoverState.focusedId = 'other';
    hoverState.mouseX = 34;
    hoverState.mouseY = 0;
    ctx = createScreenContext(hoverState);
    Button(ctx, {
      id: 'deploy',
      label: 'Deploy',
      variant: 'primary',
      width: 16,
    });
    const hoverFg = hoverState.backBuffer.find(
      (cell) => cell.char === '',
    )?.fgCode;

    expect(idleFg).not.toBe(hoverFg);
  });

  test('Button hover hit testing respects explicit y', () => {
    const idleState = createScreenState();
    idleState.width = 80;
    idleState.focusedId = 'other';
    idleState.mouseX = 34;
    idleState.mouseY = 0;
    let ctx = createScreenContext(idleState);
    Button(ctx, {
      id: 'deploy',
      label: 'Deploy',
      variant: 'primary',
      width: 16,
      y: 2,
    });
    const idleFg = idleState.backBuffer.find(
      (cell) => cell.char === '',
    )?.fgCode;

    const hoverState = createScreenState();
    hoverState.width = 80;
    hoverState.focusedId = 'other';
    hoverState.mouseX = 34;
    hoverState.mouseY = 2;
    ctx = createScreenContext(hoverState);
    Button(ctx, {
      id: 'deploy',
      label: 'Deploy',
      variant: 'primary',
      width: 16,
      y: 2,
    });
    const hoverFg = hoverState.backBuffer.find(
      (cell) => cell.char === '',
    )?.fgCode;

    expect(idleFg).not.toBe(hoverFg);
  });

  test('Button pressed state uses color values for backgrounds', () => {
    const state = createScreenState();
    state.width = 80;
    state.focusedId = 'abort';
    state.mouseButton = 0;
    state.isMouseDown = true;
    state.mouseX = 34;
    state.mouseY = 0;

    const ctx = createScreenContext(state);
    Button(ctx, {
      id: 'abort',
      label: 'ABORT',
      variant: 'danger',
    });
    const rendered = state.backBuffer.map((cell) => cell.char).join('');

    expect(rendered).not.toContain('(text)');
    expect(rendered).not.toContain('=>');
  });

  test('danger Button renders as filled button without side borders', () => {
    const state = createScreenState();
    state.width = 80;

    const ctx = createScreenContext(state);
    Button(ctx, {
      id: 'abort',
      label: 'ABORT',
      variant: 'danger',
    });
    const rendered = state.backBuffer.map((cell) => cell.char).join('');

    expect(rendered).not.toContain('│');
    expect(rendered).not.toContain('╭');
  });

  test('filled Button defaults to compact height', () => {
    const state = createScreenState();
    state.width = 80;

    const ctx = createScreenContext(state);
    Button(ctx, {
      id: 'deploy',
      label: 'DEPLOY',
      variant: 'primary',
    });

    const renderedRows = new Set<number>();
    state.backBuffer.forEach((cell, index) => {
      if (cell.char !== ' ') renderedRows.add(Math.floor(index / state.width));
    });

    expect(renderedRows.size).toBe(1);
  });

  test('ghost Button defaults to compact height', () => {
    const state = createScreenState();
    state.width = 80;

    const ctx = createScreenContext(state);
    Button(ctx, {
      id: 'abort',
      label: 'Abort',
      variant: 'ghost',
    });

    const renderedRows = new Set<number>();
    state.backBuffer.forEach((cell, index) => {
      if (cell.char !== ' ') renderedRows.add(Math.floor(index / state.width));
    });

    expect(renderedRows.size).toBe(1);
  });

  test('Button primary derives pill colors from theme tokens', () => {
    const state = createScreenState();
    state.width = 80;
    state.focusedId = 'other'; // keep the button idle (no auto-focus)

    const ctx = createScreenContext(state);
    Button(ctx, { id: 'deploy', label: 'Deploy', variant: 'primary' });

    const labelCell = state.backBuffer.find((cell) => cell.char === 'D');
    expect(labelCell?.bg).toEqual(darkTheme.primary.rgb);
    expect(labelCell?.fg).toEqual(darkTheme.onPrimary.rgb);
  });

  test('Button hover shift is mode-aware (brighter on dark, darker on light)', () => {
    const luminance = (rgb: { r: number; g: number; b: number }) =>
      0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

    const hoverBg = (theme: typeof darkTheme) => {
      const state = createScreenState({ theme });
      state.width = 80;
      state.focusedId = 'other';
      state.mouseX = 34;
      state.mouseY = 0;
      const ctx = createScreenContext(state);
      Button(ctx, { id: 'deploy', label: 'Deploy', variant: 'primary' });
      const cell = state.backBuffer.find((c) => c.char === 'D');
      return cell?.bg as { r: number; g: number; b: number };
    };

    expect(luminance(hoverBg(darkTheme))).toBeGreaterThan(
      luminance(darkTheme.primary.rgb),
    );
    expect(luminance(hoverBg(lightTheme))).toBeLessThan(
      luminance(lightTheme.primary.rgb),
    );
  });

  test('focused list defaults its selected row bg to theme.selection', () => {
    const state = createScreenState();
    state.width = 40;
    state.height = 6;

    const ctx = createScreenContext(state);
    ctx.list('mylist', ['alpha', 'beta'], { width: 20 });
    ctx.flushFlow();

    const selected = state.backBuffer.find((cell) => cell.char === 'l'); // a[l]pha
    expect(selected?.bg).toEqual(darkTheme.selection.rgb);
    const unselected = state.backBuffer.find((cell) => cell.char === 'b');
    expect(unselected?.bg).toBeUndefined();
  });

  test("Card 'variant' maps to theme tokens and 'theme' stays a deprecated alias", () => {
    const renderCard = (props: Record<string, unknown>) => {
      const state = createScreenState();
      state.width = 40;
      state.height = 8;
      const ctx = createScreenContext(state);
      Card(ctx, { title: 'Status', width: 30, ...props }, () => {});
      ctx.flushFlow();
      return state;
    };

    const viaVariant = renderCard({ variant: 'danger' });
    const titleCell = viaVariant.backBuffer.find((cell) => cell.char === 'S');
    expect(titleCell?.fg).toEqual(darkTheme.danger.rgb);

    const viaAlias = renderCard({ theme: 'danger' });
    const aliasTitle = viaAlias.backBuffer.find((cell) => cell.char === 'S');
    expect(aliasTitle?.fg).toEqual(darkTheme.danger.rgb);
  });

  test('ctx.terminal exposes the detected TerminalProfile', () => {
    const state = createScreenState();
    const ctx = createScreenContext(state);

    expect(ctx.terminal).toBe(state.terminal!);
    expect(typeof ctx.terminal.app).toBe('string');
    expect(typeof ctx.terminal.truecolor).toBe('boolean');
    expect(typeof ctx.terminal.syncOutput).toBe('boolean');
    expect(['yes', 'no', 'assumed-yes', 'assumed-no']).toContain(
      ctx.terminal.nerdFont,
    );
  });

  test('box respects maxWidth and truncates content', () => {
    const content = 'this is a very long line that should be truncated';
    const b = box(content, { maxWidth: 20, border: 'normal' });
    const lines = b.split('\n');
    // border(1) + space(0) + content(18) + border(1) = 20
    expect(visibleWidth(lines[1] ?? '')).toBe(20);
    expect(lines[1]).toContain('…');
  });

  test('box string renderer ignores gradient backgrounds', () => {
    const out = box('gradient', {
      bgColor: {
        colors: createGradient(['red', 'blue'], 2),
        direction: 'horizontal',
        steps: 2,
      },
    });

    expect(out).toContain('gradient');
    expect(out).not.toContain('[object Object]');
  });

  test('useState supports both keyed and keyless usage', () => {
    const state = createScreenState();
    const ctx1 = createScreenContext(state);

    const [val1, setVal1] = ctx1.useState('myKey', 'first');
    const [val2, setVal2] = ctx1.useState('second');

    expect(val1).toBe('first');
    expect(val2).toBe('second');

    setVal1('first-updated');
    setVal2('second-updated');

    const ctx2 = createScreenContext(state);
    const [val1New] = ctx2.useState('myKey', 'first');
    const [val2New] = ctx2.useState('second');

    expect(val1New).toBe('first-updated');
    expect(val2New).toBe('second-updated');
  });

  test('useAsync supports both keyed and keyless usage and updates state', async () => {
    const state = createScreenState();
    let tickCalled = false;
    (state as any).requestTick = () => {
      tickCalled = true;
    };

    const ctx1 = createScreenContext(state);

    // Call keyless useAsync
    const fetcher = () => Promise.resolve('hello-async');
    const res1 = ctx1.useAsync(fetcher);

    expect(res1.loading).toBe(true);
    expect(res1.data).toBeUndefined();

    // Let the promise resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(tickCalled).toBe(true);

    const ctx2 = createScreenContext(state);
    const res2 = ctx2.useAsync(fetcher);

    expect(res2.loading).toBe(false);
    expect(res2.data).toBe('hello-async');
  });
});
