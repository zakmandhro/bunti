/**
 * Input tokenizer, key queue, click-on-release, and held-key tests.
 *
 * Covers the Track A input parser rewrite: chunk-split escape sequences,
 * bare-ESC disambiguation, multi-event chunks, navigation keys, ctrl/alt
 * modifiers, grapheme text events, terminal-response routing, click
 * semantics, held-key expiry, and lastKey back-compat.
 */

import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { createScreenContext } from '../src/dsl';
import {
  HeldKeyTracker,
  type InputToken,
  InputTokenizer,
  type KeyEvent,
} from '../src/input';
import { applyInputToState, drainFrameInput } from '../src/render';
import { createScreenState } from '../src/state';

function keysOf(tokens: InputToken[]): KeyEvent[] {
  return tokens
    .filter((t): t is Extract<InputToken, { type: 'key' }> => t.type === 'key')
    .map((t) => t.event);
}

function pushKeys(tokenizer: InputTokenizer, chunk: string): KeyEvent[] {
  return keysOf(tokenizer.push(chunk));
}

describe('InputTokenizer: sequences and modifiers', () => {
  test('parses every navigation key (CSI, CSI-tilde, and SS3 forms)', () => {
    const tokenizer = new InputTokenizer();
    const cases: Array<[string, string]> = [
      ['\x1b[A', 'up'],
      ['\x1b[B', 'down'],
      ['\x1b[C', 'right'],
      ['\x1b[D', 'left'],
      ['\x1b[H', 'home'],
      ['\x1b[F', 'end'],
      ['\x1b[1~', 'home'],
      ['\x1b[2~', 'insert'],
      ['\x1b[3~', 'delete'],
      ['\x1b[4~', 'end'],
      ['\x1b[5~', 'pageup'],
      ['\x1b[6~', 'pagedown'],
      ['\x1b[7~', 'home'],
      ['\x1b[8~', 'end'],
      ['\x1bOA', 'up'],
      ['\x1bOB', 'down'],
      ['\x1bOC', 'right'],
      ['\x1bOD', 'left'],
      ['\x1bOH', 'home'],
      ['\x1bOF', 'end'],
    ];
    for (const [raw, key] of cases) {
      const events = pushKeys(tokenizer, raw);
      expect(`${raw.slice(1)}=${events[0]?.key}`).toBe(
        `${raw.slice(1)}=${key}`,
      );
      expect(events).toHaveLength(1);
      expect(events[0]!.kind).toBe('press');
      expect(events[0]!.raw).toBe(raw);
    }
  });

  test('decodes xterm modifier parameters on CSI keys', () => {
    const tokenizer = new InputTokenizer();
    const cases: Array<[string, string, Partial<KeyEvent>]> = [
      ['\x1b[1;2A', 'up', { shift: true, alt: false, ctrl: false }],
      ['\x1b[1;3D', 'left', { shift: false, alt: true, ctrl: false }],
      ['\x1b[1;5C', 'right', { shift: false, alt: false, ctrl: true }],
      ['\x1b[1;6C', 'right', { shift: true, alt: false, ctrl: true }],
      ['\x1b[1;7B', 'down', { shift: false, alt: true, ctrl: true }],
      ['\x1b[1;5H', 'home', { ctrl: true }],
      ['\x1b[3;5~', 'delete', { ctrl: true }],
      ['\x1b[5;3~', 'pageup', { alt: true }],
    ];
    for (const [raw, key, mods] of cases) {
      const [event] = pushKeys(tokenizer, raw);
      expect(event!.key).toBe(key);
      for (const [mod, value] of Object.entries(mods)) {
        expect(`${raw.slice(1)} ${mod}=${event![mod as 'ctrl']}`).toBe(
          `${raw.slice(1)} ${mod}=${value}`,
        );
      }
    }
  });

  test('CSI Z is shift+tab', () => {
    const [event] = pushKeys(new InputTokenizer(), '\x1b[Z');
    expect(event).toMatchObject({ key: 'tab', shift: true, kind: 'press' });
  });

  test('ctrl bytes \\x01-\\x1a become ctrl+letter; classics stay normalized', () => {
    const tokenizer = new InputTokenizer();
    expect(pushKeys(tokenizer, '\x01')[0]).toMatchObject({
      key: 'a',
      ctrl: true,
    });
    expect(pushKeys(tokenizer, '\x17')[0]).toMatchObject({
      key: 'w',
      ctrl: true,
    });
    expect(pushKeys(tokenizer, '\x1a')[0]).toMatchObject({
      key: 'z',
      ctrl: true,
    });
    expect(pushKeys(tokenizer, '\x03')[0]).toMatchObject({
      key: 'c',
      ctrl: true,
    });
    // \t, \r, \n, \x7f, \x08 keep their normalized names, not ctrl codes.
    expect(pushKeys(tokenizer, '\t')[0]).toMatchObject({
      key: 'tab',
      ctrl: false,
    });
    expect(pushKeys(tokenizer, '\r')[0]).toMatchObject({
      key: 'enter',
      ctrl: false,
    });
    expect(pushKeys(tokenizer, '\n')[0]).toMatchObject({
      key: 'enter',
      ctrl: false,
    });
    expect(pushKeys(tokenizer, '\x7f')[0]).toMatchObject({
      key: 'backspace',
      ctrl: false,
    });
    expect(pushKeys(tokenizer, '\x08')[0]).toMatchObject({
      key: 'backspace',
      ctrl: false,
    });
  });

  test('alt-prefixed ESC+char and ESC+control', () => {
    const tokenizer = new InputTokenizer();
    expect(pushKeys(tokenizer, '\x1ba')[0]).toMatchObject({
      key: 'a',
      alt: true,
      ctrl: false,
    });
    expect(pushKeys(tokenizer, '\x1b\x7f')[0]).toMatchObject({
      key: 'backspace',
      alt: true,
    });
    expect(pushKeys(tokenizer, '\x1b\x06')[0]).toMatchObject({
      key: 'f',
      alt: true,
      ctrl: true,
    });
  });

  test('segments printable text per grapheme — emoji arrive whole', () => {
    const tokenizer = new InputTokenizer();
    const events = pushKeys(tokenizer, 'a🍭b');
    expect(events.map((e) => e.key)).toEqual(['a', '🍭', 'b']);

    // ZWJ family emoji is a single grapheme, thus a single key event.
    const family = pushKeys(tokenizer, '👨‍👩‍👧‍👦');
    expect(family).toHaveLength(1);
    expect(family[0]!.key).toBe('👨‍👩‍👧‍👦');
  });
});

describe('InputTokenizer: chunk reassembly and ESC disambiguation', () => {
  test('reassembles escape sequences split across chunks', () => {
    const tokenizer = new InputTokenizer();
    expect(tokenizer.push('\x1b')).toEqual([]);
    expect(tokenizer.hasPending()).toBe(true);
    expect(tokenizer.push('[1;5')).toEqual([]);
    const [event] = pushKeys(tokenizer, 'C');
    expect(event).toMatchObject({ key: 'right', ctrl: true });
    expect(tokenizer.hasPending()).toBe(false);
  });

  test('reassembles SGR mouse sequences split across chunks', () => {
    const tokenizer = new InputTokenizer();
    expect(tokenizer.push('\x1b[<0;1')).toEqual([]);
    const tokens = tokenizer.push('0;5M');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'mouse',
      button: 0,
      x: 10,
      y: 5,
      action: 'press',
    });
  });

  test('bare ESC flushes as escape only after the injectable timeout', () => {
    let scheduled: { callback: () => void; ms: number } | null = null;
    let cancels = 0;
    const flushed: InputToken[][] = [];
    const tokenizer = new InputTokenizer({
      escTimeoutMs: 25,
      schedule: (callback, ms) => {
        scheduled = { callback, ms };
        return 'handle';
      },
      cancel: () => {
        cancels++;
        scheduled = null;
      },
      onFlush: (tokens) => flushed.push(tokens),
    });

    expect(tokenizer.push('\x1b')).toEqual([]);
    expect(scheduled!.ms).toBe(25);
    expect(flushed).toHaveLength(0);

    scheduled!.callback(); // the timeout proves the ESC stands alone
    expect(flushed).toHaveLength(1);
    expect(keysOf(flushed[0]!)[0]).toMatchObject({ key: 'escape' });
    expect(tokenizer.hasPending()).toBe(false);
    expect(cancels).toBe(0); // a fired timer is never also canceled
  });

  test('a following chunk cancels the ESC timer and completes the sequence', () => {
    let pendingTimer = 0;
    const tokenizer = new InputTokenizer({
      schedule: () => {
        pendingTimer++;
        return 'handle';
      },
      cancel: () => {
        pendingTimer--;
      },
    });

    tokenizer.push('\x1b');
    expect(pendingTimer).toBe(1);
    const [event] = pushKeys(tokenizer, '[B');
    expect(event).toMatchObject({ key: 'down' });
    expect(pendingTimer).toBe(0); // timer canceled, no phantom escape
  });

  test('ESC followed quickly by a char resolves as alt+char', () => {
    const tokenizer = new InputTokenizer({ schedule: () => 'handle' });
    tokenizer.push('\x1b');
    const [event] = pushKeys(tokenizer, 'x');
    expect(event).toMatchObject({ key: 'x', alt: true });
  });

  test('ESC ESC: the first ESC is a standalone escape press', () => {
    const events = pushKeys(new InputTokenizer(), '\x1b\x1b[A');
    expect(events.map((e) => e.key)).toEqual(['escape', 'up']);
  });

  test('parses multiple key and mouse events from a single chunk', () => {
    const tokenizer = new InputTokenizer();
    const tokens = tokenizer.push('\x1b[Aab\x1b[<64;3;2M\x1b[<0;10;5M\x1b[3~');

    const keys = keysOf(tokens);
    expect(keys.map((e) => e.key)).toEqual(['up', 'a', 'b', 'delete']);

    const mice = tokens.filter((t) => t.type === 'mouse');
    expect(mice).toHaveLength(2);
    expect(mice[0]).toMatchObject({ button: 64, x: 3, y: 2 });
    expect(mice[1]).toMatchObject({ button: 0, x: 10, y: 5 });

    // Order is preserved: up, a, b, wheel, press, delete.
    expect(tokens.map((t) => t.type)).toEqual([
      'key',
      'key',
      'key',
      'mouse',
      'mouse',
      'key',
    ]);
  });
});

describe('terminal responses: routed to the response channel, never keys', () => {
  test('tokenizer classifies every probe reply', () => {
    const tokenizer = new InputTokenizer();
    const cases: Array<[string, string]> = [
      ['\x1b[12;40R', 'cursor-position'],
      ['\x1b[?62;22c', 'device-attributes'],
      ['\x1b[>1;95;0c', 'device-attributes-secondary'],
      ['\x1b[?2026;2$y', 'mode-report'],
      ['\x1bP>|kitty(0.32.1)\x1b\\', 'terminal-version'],
    ];
    for (const [raw, kind] of cases) {
      const tokens = tokenizer.push(raw);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.type).toBe('response');
      const response = (tokens[0] as Extract<InputToken, { type: 'response' }>)
        .response;
      expect(`${kind}:${response.kind}`).toBe(`${kind}:${kind}`);
      expect(response.raw).toBe(raw);
    }
  });

  test('cursor position report parses row/col and skips the key queue', () => {
    const state = createScreenState();
    applyInputToState(state, '\x1b[12;40R');

    expect(state.keyQueue).toHaveLength(0);
    expect(state.lastKey).toBeUndefined();
    expect(state.terminalResponses).toHaveLength(1);
    expect(state.terminalResponses[0]).toMatchObject({
      kind: 'cursor-position',
      row: 12,
      col: 40,
    });

    drainFrameInput(state);
    expect(state.keys).toHaveLength(0);
    expect(state.lastKey).toBeUndefined();
  });

  test('a DCS reply split across chunks is reassembled as one response', () => {
    const state = createScreenState();
    applyInputToState(state, '\x1bP>|Ghost');
    expect(state.terminalResponses).toHaveLength(0);
    applyInputToState(state, 'ty 1.0.0\x1b\\');
    expect(state.terminalResponses).toHaveLength(1);
    expect(state.terminalResponses[0]!.kind).toBe('terminal-version');
    expect(state.keyQueue).toHaveLength(0);
  });
});

describe('applyInputToState: queue, lastKey back-compat, click-on-release', () => {
  test('lastKey keeps every legacy name', () => {
    const cases: Array<[string[], string]> = [
      [['\x1b[A'], 'up'],
      [['\x1b[B'], 'down'],
      [['\x1b[C'], 'right'],
      [['\x1b[D'], 'left'],
      [['\r'], 'enter'],
      [['\n'], 'enter'],
      [['\t'], 'tab'],
      [['\x7f'], 'backspace'],
      [['x'], 'x'],
      [[' '], ' '],
      [['\x1b[<64;3;2M'], 'wheel_up'],
      [['\x1b[<65;3;2M'], 'wheel_down'],
      [['\x1b[<0;5;3M', '\x1b[<0;5;3m'], 'click'],
    ];
    for (const [chunks, expected] of cases) {
      const state = createScreenState();
      for (const chunk of chunks) applyInputToState(state, chunk);
      expect(`${JSON.stringify(chunks)}=${state.lastKey}`).toBe(
        `${JSON.stringify(chunks)}=${expected}`,
      );
      drainFrameInput(state);
      expect(state.lastKey).toBe(expected); // survives the frame drain
      drainFrameInput(state);
      expect(state.lastKey).toBeUndefined(); // exactly one frame
    }
  });

  test('bare ESC resolves to lastKey escape through the injectable timer', () => {
    const state = createScreenState();
    let fire: (() => void) | null = null;
    state.inputTokenizer = new InputTokenizer({
      schedule: (callback) => {
        fire = callback;
        return 'handle';
      },
      cancel: () => {
        fire = null;
      },
    });

    applyInputToState(state, '\x1b');
    expect(state.lastKey).toBeUndefined(); // ambiguous until the timer
    fire!();
    expect(state.lastKey).toBe('escape');
    drainFrameInput(state);
    expect(state.keys[0]).toMatchObject({ key: 'escape', kind: 'press' });
  });

  test('multiple keys in one chunk all land in the frame; lastKey is the first', () => {
    const state = createScreenState();
    applyInputToState(state, 'abc');
    drainFrameInput(state);

    expect(state.keys.map((e) => e.key)).toEqual(['a', 'b', 'c']);
    expect(state.lastKey).toBe('a');
  });

  test('ctrl and alt keys never leak into the legacy lastKey slot', () => {
    const state = createScreenState();
    applyInputToState(state, '\x01'); // ctrl+a used to leak as "\x01"
    applyInputToState(state, '\x1b[1;5C');
    applyInputToState(state, '\x1bf');
    drainFrameInput(state);

    expect(state.lastKey).toBeUndefined();
    expect(state.keys.map((e) => [e.key, e.ctrl, e.alt])).toEqual([
      ['a', true, false],
      ['right', true, false],
      ['f', false, true],
    ]);
  });

  test('ctrl+c keeps its stop/SIGINT behavior and stays out of the queue', () => {
    const state = createScreenState();
    let stopped = 0;
    applyInputToState(state, '\x03', () => stopped++);
    expect(stopped).toBe(1);
    expect(state.keyQueue).toHaveLength(0);
    expect(state.lastKey).toBeUndefined();
  });

  test('press records origin; click fires once on release through the drain', () => {
    const state = createScreenState();

    // Press inside; no click yet.
    applyInputToState(state, '\x1b[<0;5;3M');
    expect(state.isMouseDown).toBe(true);
    drainFrameInput(state);
    expect(state.keys.some((e) => e.key === 'click')).toBe(false);

    // Drag then release elsewhere: one click at the PRESS origin.
    applyInputToState(state, '\x1b[<32;8;4M'); // drag motion
    applyInputToState(state, '\x1b[<0;9;6m'); // release
    expect(state.isMouseDown).toBe(false);
    drainFrameInput(state);

    const clicks = state.keys.filter((e) => e.key === 'click');
    expect(clicks).toHaveLength(1);
    expect(state.lastKey).toBe('click');
    expect(state.clickX).toBe(4); // press origin (5-1), not release (9-1)
    expect(state.clickY).toBe(2);

    // Click state lasts exactly one frame.
    drainFrameInput(state);
    expect(state.keys).toHaveLength(0);
    expect(state.clickX).toBeUndefined();

    // A release without a tracked press emits nothing.
    applyInputToState(state, '\x1b[<0;9;6m');
    drainFrameInput(state);
    expect(state.keys).toHaveLength(0);
  });

  test('wheel events pass through unchanged and skip press state', () => {
    const state = createScreenState();
    applyInputToState(state, '\x1b[<64;3;2M');
    expect(state.lastKey).toBe('wheel_up');
    expect(state.isMouseDown).toBe(false);
    drainFrameInput(state);
    expect(state.keys[0]).toMatchObject({ key: 'wheel_up' });
  });
});

describe('hitbox click and hover semantics', () => {
  test('isClicked is true exactly one frame, at the press-origin hitbox', () => {
    const state = createScreenState();
    applyInputToState(state, '\x1b[<0;5;3M'); // press inside the box
    applyInputToState(state, '\x1b[<0;30;20m'); // release far away
    drainFrameInput(state);

    let ctx = createScreenContext(state);
    const result = ctx.hitbox('btn', { x: 0, y: 0, width: 10, height: 5 });
    expect(result.clicked).toBe(true);
    expect(ctx.isClicked('btn')).toBe(true);

    drainFrameInput(state);
    ctx = createScreenContext(state);
    ctx.hitbox('btn', { x: 0, y: 0, width: 10, height: 5 });
    expect(ctx.isClicked('btn')).toBe(false);
  });

  test('a click whose press origin is outside the hitbox does not count', () => {
    const state = createScreenState();
    applyInputToState(state, '\x1b[<0;30;20M'); // press outside
    applyInputToState(state, '\x1b[<0;5;3m'); // release inside
    drainFrameInput(state);

    const ctx = createScreenContext(state);
    const result = ctx.hitbox('btn', { x: 0, y: 0, width: 10, height: 5 });
    expect(result.clicked).toBe(false);
  });

  test('manually driven states keep the lastKey=click contract', () => {
    const state = createScreenState();
    state.mouseX = 2;
    state.mouseY = 1;
    state.lastKey = 'click';

    const ctx = createScreenContext(state);
    const result = ctx.hitbox('btn', { x: 0, y: 0, width: 4, height: 2 });
    expect(result.clicked).toBe(true);
  });

  test('isHoverEnter and isHoverLeave fire one frame each', () => {
    const state = createScreenState();
    const bounds = { x: 0, y: 0, width: 10, height: 3 };

    // Frame 1: mouse outside — no events.
    state.mouseX = 50;
    state.mouseY = 10;
    let ctx = createScreenContext(state);
    ctx.hitbox('card', bounds);
    expect(ctx.isHoverEnter('card')).toBe(false);
    expect(ctx.isHoverLeave('card')).toBe(false);

    // Frame 2: mouse moves in — enter fires.
    state.mouseX = 4;
    state.mouseY = 1;
    ctx = createScreenContext(state);
    ctx.hitbox('card', bounds);
    expect(ctx.isHoverEnter('card')).toBe(true);
    expect(ctx.isHovered('card')).toBe(true);

    // Frame 3: still inside — enter no longer fires.
    ctx = createScreenContext(state);
    ctx.hitbox('card', bounds);
    expect(ctx.isHoverEnter('card')).toBe(false);
    expect(ctx.isHoverLeave('card')).toBe(false);

    // Frame 4: mouse moves out — leave fires once.
    state.mouseX = 50;
    ctx = createScreenContext(state);
    ctx.hitbox('card', bounds);
    expect(ctx.isHoverLeave('card')).toBe(true);
    expect(ctx.isHoverEnter('card')).toBe(false);

    // Frame 5: still outside — leave no longer fires.
    ctx = createScreenContext(state);
    ctx.hitbox('card', bounds);
    expect(ctx.isHoverLeave('card')).toBe(false);
  });
});

describe('held keys', () => {
  test('HeldKeyTracker classifies press/repeat and expires with the clock', () => {
    let now = 1000;
    const tracker = new HeldKeyTracker({
      holdWindowMs: 150,
      now: () => now,
    });
    const right: KeyEvent = {
      key: 'right',
      kind: 'press',
      ctrl: false,
      alt: false,
      shift: false,
      raw: '\x1b[C',
    };

    expect(tracker.record(right).kind).toBe('press');
    expect(tracker.isHeld('right')).toBe(true);

    now += 100; // repeat arrives inside the window
    expect(tracker.record(right).kind).toBe('repeat');
    expect(tracker.isHeld('right')).toBe(true);
    expect(tracker.collectReleases()).toEqual([]);

    now += 151; // repeat stream went silent
    expect(tracker.isHeld('right')).toBe(false);
    const releases = tracker.collectReleases();
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({ key: 'right', kind: 'release' });

    // Expiry is one-shot; pressing again starts a fresh press.
    expect(tracker.collectReleases()).toEqual([]);
    expect(tracker.record(right).kind).toBe('press');
  });

  test('drain synthesizes a release KeyEvent when a held key expires', () => {
    let now = 0;
    const state = createScreenState();
    state.heldKeys = new HeldKeyTracker({ holdWindowMs: 150, now: () => now });

    applyInputToState(state, '\x1b[C');
    drainFrameInput(state);
    expect(state.keys[0]).toMatchObject({ key: 'right', kind: 'press' });

    now += 100;
    applyInputToState(state, '\x1b[C'); // terminal auto-repeat
    drainFrameInput(state);
    expect(state.keys[0]).toMatchObject({ key: 'right', kind: 'repeat' });

    now += 200; // stream expires
    drainFrameInput(state);
    expect(state.keys).toHaveLength(1);
    expect(state.keys[0]).toMatchObject({ key: 'right', kind: 'release' });
    expect(state.lastKey).toBeUndefined(); // releases never hit lastKey
  });

  test('ctx.isKeyHeld, ctx.keys, and ctx.keyPressed reflect the frame', () => {
    let now = 0;
    const state = createScreenState();
    state.heldKeys = new HeldKeyTracker({ holdWindowMs: 150, now: () => now });

    applyInputToState(state, '\x1b[C');
    drainFrameInput(state);
    let ctx = createScreenContext(state);
    expect(ctx.keys).toHaveLength(1);
    expect(ctx.keyPressed('right')).toBe(true);
    expect(ctx.keyPressed('left')).toBe(false);
    expect(ctx.isKeyHeld('right')).toBe(true);

    now += 300;
    drainFrameInput(state);
    ctx = createScreenContext(state);
    expect(ctx.isKeyHeld('right')).toBe(false);
    expect(ctx.keyPressed('right')).toBe(false); // release is not a press
    expect(ctx.keys[0]).toMatchObject({ key: 'right', kind: 'release' });
  });
});

describe('held-key spike (subprocess exit criterion)', () => {
  test('a box moves while arrows repeat via piped stdin, then release fires', async () => {
    const fixture = resolve(import.meta.dir, 'fixtures', 'held-key-spike.ts');
    const proc = Bun.spawn(['bun', fixture], {
      stdin: 'pipe',
      stdout: 'ignore',
      stderr: 'pipe',
    });

    // Simulate a held right arrow: repeats every 40ms for ~400ms
    // (well inside the 150ms hold window), then silence -> release.
    for (let i = 0; i < 10; i++) {
      proc.stdin.write('\x1b[C');
      await new Promise((r) => setTimeout(r, 40));
    }
    proc.stdin.end();

    const timer = setTimeout(() => proc.kill(), 15_000);
    const exitCode = await proc.exited;
    clearTimeout(timer);
    const report = JSON.parse(await new Response(proc.stderr).text()) as {
      x: number;
      moves: number;
      sawHold: boolean;
      sawRelease: boolean;
    };

    expect(exitCode).toBe(0);
    expect(report.sawHold).toBe(true);
    expect(report.sawRelease).toBe(true);
    // The box glided over multiple frames, not a single hop.
    expect(report.moves).toBeGreaterThanOrEqual(3);
    expect(report.x).toBeGreaterThan(2);
  }, 20_000);
});
