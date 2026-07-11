/**
 * Bunti Dev Diagnostics
 *
 * Non-fatal "you probably meant" hints that teach the API while you build.
 * Hints are buffered (deduplicated) and flushed ONCE to stderr when the
 * process exits — never mid-frame, so a warning can never tear an active
 * render. All hints are suppressed when NODE_ENV=production or
 * BUNTI_NO_HINTS=1.
 *
 * The icon engine's unknown-name warnings flow through the same buffer via
 * registerHintFlusher(), so a session produces at most one hint block.
 */

import type { Rect } from './geometry';
import type { ScreenOptions } from './state';

/** Lazily produces extra hint lines at flush time (used by the icon engine). */
type HintFlusher = () => string[];

const hints = new Set<string>();
const flushers = new Set<HintFlusher>();
let exitHookInstalled = false;

/** True when dev hints are disabled (NODE_ENV=production or BUNTI_NO_HINTS=1). */
export function hintsSuppressed(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.BUNTI_NO_HINTS === '1'
  );
}

function installExitHook(): void {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  // 'exit' handlers must stay synchronous; flushHints only writes a string.
  process.on('exit', flushHints);
}

/**
 * Buffers a one-line dev hint (deduplicated by message). Never writes to
 * the terminal directly — everything drains on process exit.
 */
export function recordHint(message: string): void {
  if (hintsSuppressed()) return;
  hints.add(message);
  installExitHook();
}

/**
 * Registers a lazy hint-line producer drained at flush time. Lets modules
 * with their own buffers (icons) share the single exit flush.
 */
export function registerHintFlusher(flusher: HintFlusher): void {
  flushers.add(flusher);
  installExitHook();
}

/** Renders and clears every buffered hint; '' when there are none. */
export function drainHints(): string {
  const lines = [...hints];
  hints.clear();
  for (const flusher of flushers) lines.push(...flusher());
  if (lines.length === 0) return '';
  const body = lines.map((line) => `  - ${line}`).join('\n');
  return `\n[bunti] dev hints (set BUNTI_NO_HINTS=1 to silence):\n${body}\n`;
}

/** Exit-hook target: writes all buffered hints to stderr, once. */
export function flushHints(): void {
  if (hintsSuppressed()) return;
  const out = drainHints();
  if (out) process.stderr.write(out);
}

// --- Nearest-name matching (shared by icons and colors) ---

/** Capped two-row Levenshtein; returns cap+1 as soon as it can bail out. */
export function editDistance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev: number[] = new Array(b.length + 1);
  let curr: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Best "did you mean" candidate for a name: exact match wins, then
 * prefix relationships, then capped edit distance (cap scales with
 * length). Returns undefined when nothing is close enough.
 */
export function nearestMatch(
  target: string,
  candidates: Iterable<string>,
): string | undefined {
  const cap = Math.max(2, Math.ceil(target.length / 3));
  let best: string | undefined;
  let bestScore = cap + 1;

  for (const candidate of candidates) {
    let score: number;
    if (candidate === target) {
      score = 0;
    } else if (candidate.startsWith(target) || target.startsWith(candidate)) {
      score = 1;
    } else {
      score = editDistance(target, candidate, cap);
    }
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
      if (score === 0) return best;
    }
  }
  return best;
}

// --- Hint 1: input read without keyboard/mouse enabled ---

/**
 * Called on reads of ctx.lastKey / ctx.keys / keyPressed / isKeyHeld:
 * hints once when neither keyboard nor mouse input was enabled, so the
 * app can never receive what it is polling for.
 */
export function hintInputReadWithoutKeyboard(options: ScreenOptions): void {
  if (options.keyboard === true || options.mouse === true) return;
  recordHint(
    'keyboard input read but { keyboard: true } not set in render options',
  );
}

// --- Hint 2: keyboard requested but stdin is not a TTY ---

/**
 * Called by the render loop: keyboard input only works on a real TTY —
 * piped stdin (CI, `echo | bun app.ts`, agent harnesses) is ignored.
 */
export function hintKeyboardStdinNotTTY(
  keyboardRequested: boolean,
  stdinIsTTY: boolean,
): void {
  if (!keyboardRequested || stdinIsTTY) return;
  recordHint(
    'keyboard requested but stdin is not a TTY (piped input is ignored); ' +
      'run in a real terminal or PTY',
  );
}

// --- Hint 3: keyless hook-order drift between frames ---

interface HookFrameLog {
  /** Finalized keyless-hook kinds of the previous frame (null = none yet). */
  prev: string[] | null;
  /** Keyless-hook kinds recorded so far this frame, by positional index. */
  curr: string[];
}

const hookLogs = new WeakMap<object, HookFrameLog>();

const HOOK_DRIFT_HINT =
  'conditional keyless useState detected — pass a stable string key';

/**
 * Marks a frame boundary for keyless-hook tracking: compares the two most
 * recent completed frames and hints once when the positional hook count
 * shrank or a slot changed type (useState <-> useAsync) — the signature of
 * conditionally-called keyless hooks returning another call's state.
 */
export function beginHookFrame(state: object): void {
  if (hintsSuppressed()) return;
  const log = hookLogs.get(state);
  if (!log) {
    hookLogs.set(state, { prev: null, curr: [] });
    return;
  }
  const { prev, curr } = log;
  if (prev !== null) {
    if (curr.length < prev.length) {
      recordHint(HOOK_DRIFT_HINT);
    } else {
      for (let i = 0; i < prev.length; i++) {
        if (curr[i] !== undefined && curr[i] !== prev[i]) {
          recordHint(HOOK_DRIFT_HINT);
          break;
        }
      }
    }
  }
  log.prev = curr;
  log.curr = [];
}

/** Records one keyless hook call (positional index + hook kind). */
export function recordKeylessHook(
  state: object,
  index: number,
  kind: 'useState' | 'useAsync',
): void {
  if (hintsSuppressed()) return;
  const log = hookLogs.get(state);
  if (!log) return;
  log.curr[index] = kind;
}

// --- Hint 4 lives in colors.ts (unknown color names, via nearestMatch) ---

// --- Hint 5: overlapping direct-rendered boxes without layers ---

let overlapHintRecorded = false;

/**
 * Cheap per-frame heuristic run by flushFlow: top-level boxes paint
 * directly to the screen buffer, so two intersecting rects mean one box
 * painted over another with nothing controlling the stacking. Hints once,
 * then stops checking. O(n²) over at most 50 rects per frame.
 */
export function hintOverlappingBoxes(rects: Rect[] | undefined): void {
  if (overlapHintRecorded || !rects || rects.length < 2) return;
  if (hintsSuppressed()) return;
  const n = Math.min(rects.length, 50);
  for (let i = 0; i < n; i++) {
    const a = rects[i]!;
    if (a.width <= 0 || a.height <= 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = rects[j]!;
      if (b.width <= 0 || b.height <= 0) continue;
      if (
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      ) {
        overlapHintRecorded = true;
        recordHint(
          'overlapping boxes detected — use ctx.layer() or zIndex for overlays',
        );
        return;
      }
    }
  }
}

// --- Test hooks ---

/** @internal Test hook: currently buffered hint messages. */
export function __bufferedHints(): string[] {
  return [...hints];
}

/** @internal Test hook: clears buffered hints and one-shot latches. */
export function __resetHints(): void {
  hints.clear();
  overlapHintRecorded = false;
}
