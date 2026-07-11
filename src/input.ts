/**
 * Bunti Input Tokenizer & Key Event Model
 *
 * A stateful tokenizer that turns raw stdin chunks into discrete input
 * tokens. It handles the realities of terminal input that a naive
 * chunk-per-key parser gets wrong:
 *
 * - Escape sequences split across stdin chunks (the tail is carried until
 *   the sequence completes or the ESC-disambiguation timeout fires).
 * - Multiple key/mouse events packed into a single chunk (each one becomes
 *   its own token, including every SGR mouse event in the chunk).
 * - CSI modifier parameters (xterm encoding: 2=shift 3=alt 5=ctrl ...),
 *   SS3 sequences, navigation keys, ctrl bytes (\x01-\x1a), and
 *   alt-prefixed ESC+char.
 * - Terminal RESPONSES (cursor position reports, DA1/DA2, DECRQM, DCS
 *   replies like XTVERSION) are routed to a separate response channel and
 *   never enter the key stream — capability-detection probes depend on this.
 * - Printable text is segmented per grapheme (Intl.Segmenter), so emoji
 *   arrive as whole key events.
 *
 * The KeyEvent shape below is FROZEN for launch. Post-launch protocol work
 * (kitty keyboard protocol, bracketed paste) must slot into this shape
 * without breaking it:
 * - `kind: 'release'` is currently only synthesized by the HeldKeyTracker
 *   when a held key's repeat stream expires (legacy terminals never report
 *   releases). The kitty protocol will later produce real release events.
 * - `kind: 'repeat'` is classified by the HeldKeyTracker heuristic, not by
 *   the terminal.
 */

const ESC = '\x1b';
const ST = '\x1b\\'; // String Terminator
const BEL = '\x07';

/** Frozen key event shape. See module docs for the evolution contract. */
export interface KeyEvent {
  /** Normalized key name: 'up', 'enter', 'a', ' ', 'click', 'wheel_up', ... */
  key: string;
  kind: 'press' | 'repeat' | 'release';
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** The raw byte sequence that produced this event ('' for synthesized). */
  raw: string;
}

export type TerminalResponseKind =
  | 'cursor-position' // CSI <row>;<col> R
  | 'device-attributes' // DA1: CSI ? ... c
  | 'device-attributes-secondary' // DA2: CSI > ... c
  | 'mode-report' // DECRQM reply: CSI ? ... $ y
  | 'terminal-version' // XTVERSION DCS reply: ESC P > | ... ST
  | 'osc' // OSC replies (e.g. color queries), BEL/ST terminated
  | 'unknown';

/**
 * A reply from the terminal to a capability/status probe. These are routed
 * to `state.terminalResponses` (consumers drain the array) and NEVER into
 * the key queue.
 */
export interface TerminalResponse {
  kind: TerminalResponseKind;
  raw: string;
  /** Parsed cursor row (1-based), cursor-position responses only. */
  row?: number;
  /** Parsed cursor column (1-based), cursor-position responses only. */
  col?: number;
}

/** A discrete unit of parsed input. */
export type InputToken =
  | { type: 'key'; event: KeyEvent }
  /** SGR mouse report. x/y are the raw 1-based protocol coordinates.
   *  action mirrors the final byte: 'M' = press/motion/wheel, 'm' = release.
   *  Wheel and motion states are encoded in the button bits (64 / 32). */
  | {
      type: 'mouse';
      button: number;
      x: number;
      y: number;
      action: 'press' | 'release';
      raw: string;
    }
  | { type: 'focus'; focused: boolean; raw: string }
  | { type: 'response'; response: TerminalResponse };

export interface InputTokenizerOptions {
  /** How long a bare ESC waits for a follow-up before flushing as the
   *  'escape' key. Default 30ms. */
  escTimeoutMs?: number;
  /** Called with tokens produced by the ESC-disambiguation timer. */
  onFlush?: (tokens: InputToken[]) => void;
  /** Injectable timer for tests. Defaults to setTimeout. */
  schedule?: (callback: () => void, ms: number) => unknown;
  /** Injectable timer cancel for tests. Defaults to clearTimeout. */
  cancel?: (handle: unknown) => void;
}

/** Creates a KeyEvent with press semantics and explicit defaults. */
export function createKeyEvent(
  key: string,
  raw: string = key,
  mods: Partial<Pick<KeyEvent, 'ctrl' | 'alt' | 'shift' | 'kind'>> = {},
): KeyEvent {
  return {
    key,
    kind: mods.kind ?? 'press',
    ctrl: mods.ctrl ?? false,
    alt: mods.alt ?? false,
    shift: mods.shift ?? false,
    raw,
  };
}

/** xterm modifier parameter decoding: value - 1 is a bitfield. */
function decodeModifierParam(code: number): {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
} {
  const bits = Number.isFinite(code) && code > 0 ? code - 1 : 0;
  return {
    shift: (bits & 1) !== 0,
    alt: (bits & 2) !== 0,
    ctrl: (bits & 4) !== 0,
  };
}

/** CSI final byte -> key name (arrow/home/end). */
const CSI_FINAL_KEYS: Record<string, string> = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  H: 'home',
  F: 'end',
};

/** CSI <code> ~ key names. */
const CSI_TILDE_KEYS: Record<number, string> = {
  1: 'home',
  2: 'insert',
  3: 'delete',
  4: 'end',
  5: 'pageup',
  6: 'pagedown',
  7: 'home',
  8: 'end',
  11: 'f1',
  12: 'f2',
  13: 'f3',
  14: 'f4',
  15: 'f5',
  17: 'f6',
  18: 'f7',
  19: 'f8',
  20: 'f9',
  21: 'f10',
  23: 'f11',
  24: 'f12',
};

/** SS3 (ESC O <char>) key names. */
const SS3_KEYS: Record<string, string> = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  H: 'home',
  F: 'end',
  P: 'f1',
  Q: 'f2',
  R: 'f3',
  S: 'f4',
};

/**
 * Normalizes a single control character to a key name.
 * Returns null for bytes we deliberately drop (\x00, \x1c-\x1f).
 */
function normalizeControlChar(
  ch: string,
): { key: string; ctrl: boolean } | null {
  switch (ch) {
    case '\r':
    case '\n':
      return { key: 'enter', ctrl: false };
    case '\t':
      return { key: 'tab', ctrl: false };
    case '\x7f':
    case '\x08':
      return { key: 'backspace', ctrl: false };
    case ESC:
      return { key: 'escape', ctrl: false };
    default: {
      const code = ch.charCodeAt(0);
      // \x01-\x1a -> ctrl+a .. ctrl+z (\x03 = ctrl+c stays a key event here;
      // the render layer maps it to stop/SIGINT behavior).
      if (code >= 0x01 && code <= 0x1a) {
        return { key: String.fromCharCode(code + 96), ctrl: true };
      }
      return null;
    }
  }
}

// Precompiled ASCII fast path: printable ASCII never needs the grapheme
// segmenter (matches the draw hot path convention in layout/utils).
const ASCII_PRINTABLE_RE = /^[\x20-\x7e]*$/;

let segmenter: Intl.Segmenter | undefined;

/** Splits printable text into graphemes; emoji/ZWJ clusters stay whole. */
function splitGraphemes(text: string): string[] {
  if (text.length === 1 || ASCII_PRINTABLE_RE.test(text)) {
    return text.split('');
  }
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const out: string[] = [];
  for (const part of segmenter.segment(text)) out.push(part.segment);
  return out;
}

/** Classifies a pending DCS/OSC fragment flushed by the timer. */
function responseFromPending(raw: string): TerminalResponse {
  if (raw.startsWith('\x1bP>|')) return { kind: 'terminal-version', raw };
  if (raw.startsWith('\x1bP')) return { kind: 'unknown', raw };
  return { kind: 'osc', raw };
}

/** Hard cap for the carried partial-sequence buffer. */
const MAX_PENDING = 4096;

/**
 * Stateful input tokenizer. Feed it stdin chunks via push(); it returns the
 * tokens completed by that chunk and carries any trailing partial escape
 * sequence into the next call. A bare ESC (or unfinished sequence) is only
 * flushed as the 'escape' key after `escTimeoutMs` with no follow-up bytes
 * (tokens produced that way arrive via `onFlush`).
 */
export class InputTokenizer {
  private pending = '';
  private timer: unknown = null;
  onFlush?: (tokens: InputToken[]) => void;

  constructor(private options: InputTokenizerOptions = {}) {
    this.onFlush = options.onFlush;
  }

  /** Parses a chunk. Returns completed tokens; partial tails are carried. */
  push(chunk: string): InputToken[] {
    this.cancelTimer();
    const buffer = this.pending + chunk;
    this.pending = '';
    const tokens: InputToken[] = [];
    this.parse(buffer, tokens);
    if (this.pending.length > MAX_PENDING) {
      tokens.push(...this.flushPending());
    } else if (this.pending) {
      this.scheduleTimer();
    }
    return tokens;
  }

  /** True if a partial sequence is being carried. */
  hasPending(): boolean {
    return this.pending.length > 0;
  }

  /**
   * Force-resolves the carried partial sequence (what the ESC timer does):
   * a bare ESC becomes the 'escape' key; a partial DCS/OSC becomes a
   * response; anything else becomes 'escape' plus its remainder as text.
   */
  flushPending(): InputToken[] {
    this.cancelTimer();
    if (!this.pending) return [];
    const pending = this.pending;
    this.pending = '';
    const tokens: InputToken[] = [];
    if (pending.startsWith('\x1bP') || pending.startsWith('\x1b]')) {
      tokens.push({ type: 'response', response: responseFromPending(pending) });
      return tokens;
    }
    tokens.push({ type: 'key', event: createKeyEvent('escape', ESC) });
    if (pending.length > 1) {
      // The remainder of a carried partial never contains another ESC.
      this.tokenizeText(pending.slice(1), tokens);
    }
    return tokens;
  }

  /** Cancels the ESC-disambiguation timer (loop teardown). */
  dispose() {
    this.cancelTimer();
  }

  private scheduleTimer() {
    const schedule =
      this.options.schedule ??
      ((callback: () => void, ms: number) => setTimeout(callback, ms));
    this.timer = schedule(() => {
      this.timer = null;
      const tokens = this.flushPending();
      if (tokens.length > 0) this.onFlush?.(tokens);
    }, this.options.escTimeoutMs ?? 30);
  }

  private cancelTimer() {
    if (this.timer === null) return;
    const cancel =
      this.options.cancel ??
      ((handle: unknown) =>
        clearTimeout(handle as ReturnType<typeof setTimeout>));
    cancel(this.timer);
    this.timer = null;
  }

  private parse(buffer: string, tokens: InputToken[]) {
    const len = buffer.length;
    let i = 0;
    let textStart = -1;

    const flushText = (end: number) => {
      if (textStart !== -1 && end > textStart) {
        this.tokenizeText(buffer.slice(textStart, end), tokens);
      }
      textStart = -1;
    };

    while (i < len) {
      if (buffer[i] !== ESC) {
        if (textStart === -1) textStart = i;
        i++;
        continue;
      }
      flushText(i);
      const consumed = this.parseEscape(buffer, i, tokens);
      if (consumed === -1) {
        // Incomplete sequence: carry the tail into the next chunk.
        this.pending = buffer.slice(i);
        return;
      }
      i += consumed;
    }
    flushText(len);
  }

  /**
   * Parses one escape sequence starting at buffer[i] (=== ESC).
   * Returns the number of chars consumed, or -1 if incomplete.
   */
  private parseEscape(buffer: string, i: number, tokens: InputToken[]): number {
    const len = buffer.length;
    if (i + 1 >= len) return -1; // bare ESC at end of chunk

    const next = buffer[i + 1]!;

    if (next === '[') return this.parseCsi(buffer, i, tokens);

    if (next === 'O') {
      // SS3
      if (i + 2 >= len) return -1;
      const key = SS3_KEYS[buffer[i + 2]!];
      if (key) {
        tokens.push({
          type: 'key',
          event: createKeyEvent(key, buffer.slice(i, i + 3)),
        });
      }
      return 3;
    }

    if (next === 'P') {
      // DCS ... ST (e.g. XTVERSION reply ESC P > | ... ST)
      const end = buffer.indexOf(ST, i + 2);
      if (end === -1) return -1;
      const raw = buffer.slice(i, end + ST.length);
      tokens.push({ type: 'response', response: responseFromPending(raw) });
      return raw.length;
    }

    if (next === ']') {
      // OSC ... (BEL | ST) — color query replies etc.
      const bel = buffer.indexOf(BEL, i + 2);
      const st = buffer.indexOf(ST, i + 2);
      let end = -1;
      let termLen = 0;
      if (bel !== -1 && (st === -1 || bel < st)) {
        end = bel;
        termLen = 1;
      } else if (st !== -1) {
        end = st;
        termLen = ST.length;
      }
      if (end === -1) return -1;
      const raw = buffer.slice(i, end + termLen);
      tokens.push({ type: 'response', response: { kind: 'osc', raw } });
      return raw.length;
    }

    if (next === ESC) {
      // ESC ESC: the first is a standalone escape press.
      tokens.push({ type: 'key', event: createKeyEvent('escape', ESC) });
      return 1;
    }

    // Alt-prefixed key: ESC + char.
    const codePoint = buffer.codePointAt(i + 1)!;
    const ch = String.fromCodePoint(codePoint);
    if (codePoint < 0x20 || codePoint === 0x7f) {
      const normalized = normalizeControlChar(ch);
      if (normalized) {
        tokens.push({
          type: 'key',
          event: createKeyEvent(normalized.key, buffer.slice(i, i + 2), {
            ctrl: normalized.ctrl,
            alt: true,
          }),
        });
      }
      return 2;
    }
    tokens.push({
      type: 'key',
      event: createKeyEvent(ch, ESC + ch, { alt: true }),
    });
    return 1 + ch.length;
  }

  /**
   * Parses a CSI sequence starting at buffer[i] (=== ESC, buffer[i+1] === '[').
   * Returns chars consumed or -1 if the final byte hasn't arrived yet.
   */
  private parseCsi(buffer: string, i: number, tokens: InputToken[]): number {
    const len = buffer.length;
    let j = i + 2;
    while (j < len) {
      const code = buffer.charCodeAt(j);
      if (code >= 0x40 && code <= 0x7e) break; // final byte
      if (code < 0x20 || code > 0x3f) {
        // Malformed sequence (e.g. a stray ESC): drop what we consumed.
        return j - i;
      }
      j++;
    }
    if (j >= len) return -1;

    const final = buffer[j]!;
    const params = buffer.slice(i + 2, j);
    const raw = buffer.slice(i, j + 1);
    const consumed = raw.length;

    // SGR mouse: CSI < b ; x ; y (M|m)
    if ((final === 'M' || final === 'm') && params.startsWith('<')) {
      const parts = params.slice(1).split(';');
      const button = Number.parseInt(parts[0] ?? '', 10);
      const x = Number.parseInt(parts[1] ?? '', 10);
      const y = Number.parseInt(parts[2] ?? '', 10);
      if (Number.isFinite(button) && Number.isFinite(x) && Number.isFinite(y)) {
        tokens.push({
          type: 'mouse',
          button,
          x,
          y,
          action: final === 'M' ? 'press' : 'release',
          raw,
        });
      }
      return consumed;
    }

    // Terminal responses — routed to the response channel, never keys.
    if (final === 'R') {
      // Cursor position report: CSI <row> ; <col> R
      const parts = params.split(';');
      const row = Number.parseInt(parts[0] ?? '', 10);
      const col = Number.parseInt(parts[1] ?? '', 10);
      const response: TerminalResponse = { kind: 'cursor-position', raw };
      if (Number.isFinite(row)) response.row = row;
      if (Number.isFinite(col)) response.col = col;
      tokens.push({ type: 'response', response });
      return consumed;
    }
    if (final === 'c' && (params.startsWith('?') || params.startsWith('>'))) {
      tokens.push({
        type: 'response',
        response: {
          kind: params.startsWith('?')
            ? 'device-attributes'
            : 'device-attributes-secondary',
          raw,
        },
      });
      return consumed;
    }
    if (final === 'y' && params.endsWith('$')) {
      tokens.push({ type: 'response', response: { kind: 'mode-report', raw } });
      return consumed;
    }

    // Focus tracking
    if (final === 'I' && params === '') {
      tokens.push({ type: 'focus', focused: true, raw });
      return consumed;
    }
    if (final === 'O' && params === '') {
      tokens.push({ type: 'focus', focused: false, raw });
      return consumed;
    }

    // Shift+Tab
    if (final === 'Z') {
      tokens.push({
        type: 'key',
        event: createKeyEvent('tab', raw, { shift: true }),
      });
      return consumed;
    }

    const parts = params.split(';');
    const modParam = Number.parseInt(parts[1] ?? '1', 10);
    const mods = decodeModifierParam(modParam);

    // CSI <code> [; <mod>] ~  navigation / function keys
    if (final === '~') {
      const code = Number.parseInt(parts[0] ?? '', 10);
      const key = CSI_TILDE_KEYS[code];
      if (key)
        tokens.push({ type: 'key', event: createKeyEvent(key, raw, mods) });
      return consumed;
    }

    // CSI [1 ; <mod>] (A|B|C|D|H|F)  arrows / home / end
    const key = CSI_FINAL_KEYS[final];
    if (key) {
      tokens.push({ type: 'key', event: createKeyEvent(key, raw, mods) });
      return consumed;
    }

    // Unknown CSI sequences are consumed and dropped.
    return consumed;
  }

  /** Tokenizes a run of non-ESC text: control bytes + printable graphemes. */
  private tokenizeText(text: string, tokens: InputToken[]) {
    const len = text.length;
    let i = 0;
    while (i < len) {
      const code = text.charCodeAt(i);
      if (code < 0x20 || code === 0x7f) {
        const normalized = normalizeControlChar(text[i]!);
        if (normalized) {
          tokens.push({
            type: 'key',
            event: createKeyEvent(normalized.key, text[i]!, {
              ctrl: normalized.ctrl,
            }),
          });
        }
        i++;
        continue;
      }
      let j = i + 1;
      while (j < len) {
        const c = text.charCodeAt(j);
        if (c < 0x20 || c === 0x7f) break;
        j++;
      }
      for (const grapheme of splitGraphemes(text.slice(i, j))) {
        tokens.push({ type: 'key', event: createKeyEvent(grapheme) });
      }
      i = j;
    }
  }
}

export interface HeldKeyOptions {
  /** A key is considered held until this long passes without a repeat.
   *  Default 150ms. */
  holdWindowMs?: number;
  /** Injectable clock for tests. Defaults to Date.now. */
  now?: () => number;
}

/**
 * Held-key heuristic for legacy terminals (which report no key releases):
 * a key is "held" from its first press until no repeat arrives within the
 * hold window. On expiry a synthetic kind:'release' KeyEvent is emitted.
 * Good enough for platformer-style movement pre-kitty-protocol.
 */
export class HeldKeyTracker {
  private held = new Map<string, number>();

  constructor(private options: HeldKeyOptions = {}) {}

  private get window(): number {
    return this.options.holdWindowMs ?? 150;
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  /**
   * Records a press-stream event and classifies it: a key seen again within
   * the hold window becomes kind:'repeat'. Release events pass through.
   */
  record(event: KeyEvent): KeyEvent {
    if (event.kind === 'release') return event;
    const now = this.now();
    const lastSeen = this.held.get(event.key);
    const kind =
      lastSeen !== undefined && now - lastSeen <= this.window
        ? 'repeat'
        : 'press';
    this.held.set(event.key, now);
    return event.kind === kind ? event : { ...event, kind };
  }

  /** True while the key's repeat stream is inside the hold window. */
  isHeld(key: string): boolean {
    const lastSeen = this.held.get(key);
    return lastSeen !== undefined && this.now() - lastSeen <= this.window;
  }

  /**
   * Expires held keys whose repeat stream went silent and synthesizes a
   * kind:'release' KeyEvent for each (raw '' — there were no real bytes).
   */
  collectReleases(): KeyEvent[] {
    const now = this.now();
    const releases: KeyEvent[] = [];
    for (const [key, lastSeen] of this.held) {
      if (now - lastSeen > this.window) {
        this.held.delete(key);
        releases.push(createKeyEvent(key, '', { kind: 'release' }));
      }
    }
    return releases;
  }
}
