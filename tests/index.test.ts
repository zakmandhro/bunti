import { describe, expect, test } from 'bun:test';
import pc from 'picocolors';
import { Button, Input } from '../src/components';
import { createScreenContext } from '../src/dsl';
import {
  box,
  createGradient,
  joinHorizontal,
  list,
  stripAnsi,
  truncate,
  visibleWidth,
} from '../src/index';
import { applyInputToState } from '../src/render';
import { createScreenState, resizeScreen } from '../src/state';

describe('Bunti Core Engine', () => {
  test('stripAnsi removes color codes', () => {
    const colored = `${pc.red('hello')} ${pc.blue('world')}`;
    expect(stripAnsi(colored)).toBe('hello world');
  });

  test('visibleWidth calculates correct length', () => {
    const colored = `${pc.bold(pc.green('✓'))} Done`;
    expect(visibleWidth(colored)).toBe(6);
  });

  test('box adds correct padding', () => {
    const b = box('hi', { padding: [0, 2] });
    expect(visibleWidth(b.split('\n')[0] ?? '')).toBe(6); // "  hi  "
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

  test('mouse input tracks SGR coordinates and click rerenders', () => {
    const state = createScreenState();
    let ticks = 0;
    (state as { requestTick?: () => void }).requestTick = () => ticks++;

    applyInputToState(state, '\x1b[<0;10;5M');

    expect(state.mouseButton).toBe(0);
    expect(state.mouseX).toBe(9);
    expect(state.mouseY).toBe(4);
    expect(state.isMouseDown).toBe(true);
    expect(state.lastKey).toBe('click');
    expect(ticks).toBe(1);
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
    } finally {
      if (columns) Object.defineProperty(process.stdout, 'columns', columns);
      else delete (process.stdout as { columns?: number }).columns;
      if (rows) Object.defineProperty(process.stdout, 'rows', rows);
      else delete (process.stdout as { rows?: number }).rows;
    }
  });

  test('Input updates managed state from normalized keyboard input', () => {
    const state = createScreenState();
    state.focusedId = 'mission';
    state.lastKey = 'a';

    const ctx = createScreenContext(state);
    Input(ctx, { id: 'mission', width: 20 });

    expect(state.componentState.get('mission')).toBe('a');
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
    const placeholderFg = placeholderState.backBuffer.find(
      (cell) => cell.char === 'E',
    )?.fgCode;

    const valueState = createScreenState();
    valueState.focusedId = 'mission';
    valueState.componentState.set('mission', 'Alpha');
    ctx = createScreenContext(valueState);
    Input(ctx, { id: 'mission', label: 'MISSION:', width: 40 });
    const valueFg = valueState.backBuffer.find(
      (cell) => cell.char === 'A',
    )?.fgCode;

    expect(String(placeholderFg)).toBe('240');
    expect(String(valueFg)).toBe('255');
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
});
