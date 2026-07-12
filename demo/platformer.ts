/**
 * STARHOP — the Bunti platformer (launch-week performance drop).
 *
 * A ~3-screen side-scroller that flexes the motion stack: dt-based physics
 * at 60fps, held-key running, coyote time + buffered variable-height jumps,
 * a halfblock pixel-sprite player (createPixelCanvas), two-layer parallax
 * (gradient sky + pixel hills), themed tile platforms, star pickups with
 * sparkle bursts, and a live FPS / frame-time HUD. Physics lives demo-side
 * in ./platformer-physics.ts — Bunti ships primitives, not game APIs.
 *
 * Keys: left/right or a/d run · space/up jump (hold = higher) · 1/2/3
 * themes · r restart · q quit.
 * Headless: --once renders one frame; --size 100x30 fakes a viewport.
 */

import {
  createPixelCanvas,
  darkTheme,
  type Gradient,
  type PixelCanvas,
  type RGB,
  render,
  type Theme,
  visibleWidth,
} from '../src/index';
import { themes } from '../src/themes/index';
import {
  clearHeld,
  createHeldKeys,
  createPlayer,
  type HeldAction,
  isHeldActive,
  noteHeld,
  type Platform,
  type SimInput,
  stepPlayer,
} from './platformer-physics';

// --- CLI flags (headless testing / recording) --------------------------------

const once = process.argv.includes('--once');
const sizeArg = process.argv[process.argv.indexOf('--size') + 1];
if (process.argv.includes('--size') && sizeArg?.includes('x')) {
  const [c, r] = sizeArg.split('x').map((n) => Number.parseInt(n, 10));
  if (c && r) {
    Object.defineProperty(process.stdout, 'columns', {
      value: c,
      configurable: true,
    });
    Object.defineProperty(process.stdout, 'rows', {
      value: r,
      configurable: true,
    });
  }
}

const THEMES: Theme[] = [darkTheme, themes.dracula!, themes['tokyo-night']!];

// --- Level -------------------------------------------------------------------
// x in columns, `top` in rows above the ground line. WORLD_W ~ 3 screens at
// 80 columns. Two pits interrupt the ground; low bridges span them.

const WORLD_W = 216;
const SPAWN_X = 6;
const GOAL_X = 208;

const GROUND: Platform[] = [
  { x: 0, w: 96, top: 0 }, // pit A: 96..99
  { x: 100, w: 62, top: 0 }, // pit B: 162..165
  { x: 166, w: 50, top: 0 },
];

const LEDGES: Platform[] = [
  { x: 20, w: 10, top: 3 },
  { x: 37, w: 8, top: 5 },
  { x: 52, w: 12, top: 3 },
  { x: 71, w: 8, top: 6 },
  { x: 90, w: 16, top: 3 }, // bridge over pit A
  { x: 112, w: 10, top: 3 },
  { x: 127, w: 8, top: 6 },
  { x: 141, w: 10, top: 3 },
  { x: 157, w: 14, top: 3 }, // bridge over pit B
  { x: 178, w: 10, top: 3 },
  { x: 192, w: 8, top: 5 },
];

const PLATFORMS: Platform[] = [...GROUND, ...LEDGES];

interface StarSpot {
  x: number;
  top: number;
}

/** Collectibles, placed along both the ground run and the ledge route. */
const STAR_SPOTS: StarSpot[] = [
  { x: 12, top: 1 },
  { x: 25, top: 5 },
  { x: 41, top: 7 },
  { x: 58, top: 5 },
  { x: 75, top: 8 },
  { x: 86, top: 2 },
  { x: 98, top: 5 }, // over pit A
  { x: 117, top: 6 },
  { x: 131, top: 8 },
  { x: 146, top: 5 },
  { x: 164, top: 5 }, // over pit B
  { x: 183, top: 5 },
  { x: 196, top: 7 },
  { x: 203, top: 1 },
];

// --- Game state (module-level, reset by resetGame) ---------------------------

const player = createPlayer(SPAWN_X, 0);
const held = createHeldKeys();
const collected: boolean[] = new Array(STAR_SPOTS.length).fill(false);
let score = 0;
let simNow = 0; // accumulated ctx.dt — the game clock
let startedAt = -1; // first input -> speedrun timer start
let finishedAt = -1; // reached the rocket
let squashUntil = -1; // landing squash window
let respawnedAt = -1e9; // respawn blink window
let runPhase = 0; // run-cycle animation phase
let camX = 0;
let safeX = SPAWN_X; // last grounded spot, for pit respawns
let safeY = 0;
let frameMs = 0; // smoothed frame time for the HUD

function resetGame() {
  player.x = SPAWN_X;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  player.facing = 1;
  player.lastGroundedAt = simNow;
  player.jumpBufferedAt = Number.NEGATIVE_INFINITY;
  player.coyoteSpent = false;
  collected.fill(false);
  score = 0;
  startedAt = -1;
  finishedAt = -1;
  squashUntil = -1;
  respawnedAt = -1e9;
  camX = 0;
  safeX = SPAWN_X;
  safeY = 0;
  for (const s of sparkles) s.active = false;
}

// --- Sparkle pool (star pickups + landing dust; zero per-frame allocation) ---

interface Sparkle {
  active: boolean;
  kind: 'star' | 'dust';
  x: number; // world column
  y: number; // rows above ground
  bornAt: number;
}

const SPARKLE_LIFE_MS = 380;
const sparkles: Sparkle[] = Array.from({ length: 10 }, () => ({
  active: false,
  kind: 'star' as const,
  x: 0,
  y: 0,
  bornAt: 0,
}));
let sparkleCursor = 0;

function spawnSparkle(kind: Sparkle['kind'], x: number, y: number) {
  const s = sparkles[sparkleCursor]!;
  sparkleCursor = (sparkleCursor + 1) % sparkles.length;
  s.active = true;
  s.kind = kind;
  s.x = x;
  s.y = y;
  s.bornAt = simNow;
}

/** Burst offsets (cells), reused across every sparkle. */
const BURST: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [1, -1],
  [-1, -1],
];

// --- Sprites (halfblock pixels: 1 cell = 2 vertical px) ----------------------
// Legend: '.' transparent · '1' body · '2' trim/feet · '3' eye.

const PLAYER_FRAMES = {
  idle: ['.111.', '11111', '13131', '11111', '.111.', '.2.2.'],
  runA: ['.111.', '11111', '13131', '11111', '.111.', '2..2.'],
  runB: ['.111.', '11111', '13131', '11111', '.111.', '.2..2'],
  jump: ['.111.', '11111', '13131', '11111', '.212.', '.....'],
  squash: ['.......', '.11111.', '1311131', '1111111'],
} as const;
type PlayerFrame = keyof typeof PLAYER_FRAMES;

const ROCKET = ['..1..', '.111.', '.131.', '.111.', '.111.', '11111', '2...2'];

function parseSprite(rows: readonly string[]): number[][] {
  return rows.map((r) => [...r].map((ch) => (ch === '.' ? 0 : Number(ch))));
}

const FRAMES: Record<PlayerFrame, number[][]> = {
  idle: parseSprite(PLAYER_FRAMES.idle),
  runA: parseSprite(PLAYER_FRAMES.runA),
  runB: parseSprite(PLAYER_FRAMES.runB),
  jump: parseSprite(PLAYER_FRAMES.jump),
  squash: parseSprite(PLAYER_FRAMES.squash),
};
const ROCKET_PX = parseSprite(ROCKET);

/** Paints a parsed sprite into a canvas with a 3-slot palette. */
function drawSprite(
  px: PixelCanvas,
  sprite: number[][],
  offX: number,
  offY: number,
  c1: RGB,
  c2: RGB,
  c3: RGB,
) {
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y]!;
    for (let x = 0; x < row.length; x++) {
      const v = row[x];
      if (v === 1) px.set(offX + x, offY + y, c1);
      else if (v === 2) px.set(offX + x, offY + y, c2);
      else if (v === 3) px.set(offX + x, offY + y, c3);
    }
  }
}

const playerCanvas = createPixelCanvas(7, 8);
const rocketCanvas = createPixelCanvas(5, 12); // rocket + flame rows

// --- Theme palette (rebuilt only on theme swap; RGB + style objects pooled) --

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}
const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };

interface BlitStylePool {
  fg?: RGB;
  bg?: RGB;
  bold?: boolean;
}

interface Palette {
  skyColors: RGB[];
  hillFar: RGB;
  hillNear: RGB;
  body: RGB;
  trim: RGB;
  eye: RGB;
  rocketBody: RGB;
  rocketWindow: RGB;
  flameA: RGB;
  flameB: RGB;
  starA: RGB;
  starB: RGB;
  voidFill: BlitStylePool;
  groundCap: BlitStylePool; // '▀' fg=cap bg=body
  groundDeep: BlitStylePool;
  platCap: BlitStylePool; // '▀' fg=cap bg=body
  dotDim: BlitStylePool;
  dotBright: BlitStylePool;
  star: BlitStylePool; // fg mutated per star per frame
  sparkle: BlitStylePool; // fg mutated per sparkle per frame
  hudTitle: BlitStylePool;
  hudStar: BlitStylePool;
  hudMuted: BlitStylePool;
  hint: BlitStylePool;
}

const paletteCache = new Map<string, Palette>();

function paletteFor(t: Theme): Palette {
  const cached = paletteCache.get(t.name);
  if (cached) return cached;

  const bg = t.background.rgb;
  const surface = t.surface.rgb;
  const primary = t.primary.rgb;
  const accent = t.accent.rgb;
  const warning = t.warning.rgb;
  const groundBody = mixRGB(surface, primary, 0.1);
  const platBody = mixRGB(surface, accent, 0.18);

  const p: Palette = {
    skyColors: [mixRGB(bg, BLACK, 0.45), bg, mixRGB(bg, primary, 0.2)],
    hillFar: mixRGB(bg, primary, 0.16),
    hillNear: mixRGB(bg, primary, 0.34),
    body: primary,
    trim: mixRGB(primary, BLACK, 0.45),
    eye: mixRGB(bg, BLACK, 0.35),
    rocketBody: mixRGB(t.foreground.rgb, accent, 0.35),
    rocketWindow: mixRGB(bg, BLACK, 0.3),
    flameA: warning,
    flameB: t.danger.rgb,
    starA: warning,
    starB: mixRGB(warning, WHITE, 0.55),
    voidFill: { bg: mixRGB(bg, BLACK, 0.6) },
    groundCap: { fg: mixRGB(surface, primary, 0.55), bg: groundBody },
    groundDeep: { bg: mixRGB(groundBody, BLACK, 0.4) },
    platCap: { fg: mixRGB(surface, accent, 0.6), bg: platBody },
    dotDim: { fg: mixRGB(bg, t.muted.rgb, 0.5) },
    dotBright: { fg: t.muted.rgb },
    star: { fg: warning },
    sparkle: { fg: warning },
    hudTitle: { fg: t.foreground.rgb, bold: true },
    hudStar: { fg: warning, bold: true },
    hudMuted: { fg: t.muted.rgb },
    hint: { fg: t.muted.rgb, bg: mixRGB(groundBody, BLACK, 0.4) },
  };
  paletteCache.set(t.name, p);
  return p;
}

const gradientCache = new Map<string, Gradient>();

// --- Parallax hills (pixel canvas, rebuilt per frame; resized on demand) -----

let hillsCanvas: PixelCanvas | null = null;
let hillsW = -1;
let hillsPxH = -1;

function drawHills(camXNow: number, pal: Palette, w: number, pxH: number) {
  if (!hillsCanvas || hillsW !== w || hillsPxH !== pxH) {
    hillsCanvas = createPixelCanvas(w, pxH);
    hillsW = w;
    hillsPxH = pxH;
  }
  const px = hillsCanvas;
  px.clear();
  for (let x = 0; x < w; x++) {
    const far = x + camXNow * 0.35;
    let hFar =
      pxH * (0.52 + 0.3 * Math.sin(far * 0.051 + 1.4)) +
      pxH * 0.16 * Math.sin(far * 0.017 + 0.6);
    hFar = Math.max(1, Math.min(pxH, Math.round(hFar)));
    for (let y = pxH - hFar; y < pxH; y++) px.set(x, y, pal.hillFar);

    const near = x + camXNow * 0.65;
    let hNear =
      pxH * (0.3 + 0.2 * Math.sin(near * 0.078 + 4.2)) +
      pxH * 0.1 * Math.sin(near * 0.031 + 2.1);
    hNear = Math.max(0, Math.min(pxH, Math.round(hNear)));
    for (let y = pxH - hNear; y < pxH; y++) px.set(x, y, pal.hillNear);
  }
  return px;
}

// --- Sky dots (deterministic, twinkling; parallax 0.25x) ----------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SkyDot {
  x: number;
  yf: number;
  phase: number;
  big: boolean;
}
const SKY_DOTS: SkyDot[] = (() => {
  const rng = mulberry32(0xb0071);
  return Array.from({ length: 64 }, () => ({
    x: rng() * (WORLD_W * 0.25 + 160),
    yf: rng(),
    phase: rng() * Math.PI * 2,
    big: rng() < 0.15,
  }));
})();

// --- Precomputed tile strings (no per-frame repeat allocations) ---------------

const CAP_GLYPHS = new Map<Platform, string>();
for (const p of PLATFORMS) CAP_GLYPHS.set(p, '▀'.repeat(p.w));

/** Pits derived from the gaps between ground segments. */
const PITS: { x: number; w: number }[] = [];
for (let i = 0; i < GROUND.length - 1; i++) {
  const a = GROUND[i]!;
  const b = GROUND[i + 1]!;
  PITS.push({ x: a.x + a.w, w: b.x - (a.x + a.w) });
}

// --- Input mapping ------------------------------------------------------------

const KEY_ACTION: Record<string, HeldAction> = {
  left: 'left',
  a: 'left',
  right: 'right',
  d: 'right',
  ' ': 'jump',
  up: 'jump',
  w: 'jump',
};

/** Reused input snapshot — stepPlayer never sees an allocation. */
const input: SimInput = {
  left: false,
  right: false,
  jumpPressed: false,
  jumpHeld: false,
};

// --- Render loop ---------------------------------------------------------------

render(
  (ctx) => {
    const t = ctx.theme;
    const pal = paletteFor(t);
    const { width: W, height: H } = ctx;
    const dt = ctx.dt; // ms, clamped to 100 by the engine
    simNow += dt;
    frameMs = frameMs === 0 ? dt : frameMs * 0.9 + dt * 0.1;

    // --- Input ---------------------------------------------------------------
    if (ctx.lastKey === 'q' || ctx.lastKey === 'escape') ctx.requestStop();
    if (ctx.lastKey === 'r') resetGame();
    const pick = Number.parseInt(ctx.lastKey ?? '', 10);
    if (pick >= 1 && pick <= THEMES.length) ctx.setTheme(THEMES[pick - 1]!);

    input.jumpPressed = false;
    for (const e of ctx.keys) {
      const action = KEY_ACTION[e.key];
      if (!action) continue;
      if (e.kind === 'release') {
        clearHeld(held, action);
      } else {
        // Any press-stream event counts as a jump intent: legacy terminals
        // have no key-up, so "space active near landing" must buffer a jump
        // (repeats included) or touchdown rebounds would depend on auto-
        // repeat phase. Holding space simply keeps hopping — intended.
        if (action === 'jump') input.jumpPressed = true;
        noteHeld(held, action, simNow);
        if (startedAt < 0) startedAt = simNow;
      }
    }
    input.left = isHeldActive(held, 'left', simNow);
    input.right = isHeldActive(held, 'right', simNow);
    input.jumpHeld = isHeldActive(held, 'jump', simNow);

    // --- Simulate ------------------------------------------------------------
    const finished = finishedAt >= 0;
    if (finished) {
      // Let the player skid to a stop while the rocket launches.
      input.left = false;
      input.right = false;
      input.jumpPressed = false;
    }
    stepPlayer(player, input, dt, simNow, PLATFORMS);
    if (player.landedImpact > 12) {
      squashUntil = simNow + 90;
      spawnSparkle('dust', player.x, player.y);
    }
    if (player.grounded) {
      safeX = player.x;
      safeY = player.y;
    }
    if (player.y < -6) {
      // Fell into a pit: respawn at the last grounded spot.
      player.x = safeX;
      player.y = safeY;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
      respawnedAt = simNow;
    }
    runPhase += Math.abs(player.vx) * (dt / 1000) * 1.6;

    // Star pickups: player AABB is x±halfW, rows y..y+3.
    for (let i = 0; i < STAR_SPOTS.length; i++) {
      if (collected[i]) continue;
      const s = STAR_SPOTS[i]!;
      if (
        Math.abs(s.x - player.x) <= 2.2 &&
        s.top >= player.y - 0.6 &&
        s.top <= player.y + 3.2
      ) {
        collected[i] = true;
        score++;
        spawnSparkle('star', s.x, s.top);
      }
    }

    // Goal: reach the rocket.
    if (!finished && player.grounded && player.x >= GOAL_X - 3) {
      finishedAt = simNow;
    }

    // --- Camera ----------------------------------------------------------------
    const camTarget = Math.min(
      Math.max(0, player.x - W * 0.38),
      Math.max(0, WORLD_W - W),
    );
    camX += (camTarget - camX) * Math.min(1, (dt / 1000) * 6);
    if (once) camX = camTarget;
    const camXi = Math.round(camX);

    // --- Draw: sky -----------------------------------------------------------
    const skyKey = t.name;
    let sky = gradientCache.get(skyKey);
    if (!sky) {
      sky = ctx.gradient({
        colors: pal.skyColors,
        direction: 'vertical',
        steps: 64, // fine steps: no visible banding across tall viewports
      });
      gradientCache.set(skyKey, sky);
    }
    ctx.wallpaper(sky);

    if (W < 60 || H < 16) {
      const msg = 'starhop needs at least 60x16';
      ctx.blit(Math.max(0, (W - msg.length) >> 1), H >> 1, msg, pal.hudMuted);
      return;
    }

    const groundRow = H - 2; // ground surface: top edge of this row
    const hillRows = Math.max(3, Math.min(11, Math.floor((H - 10) / 2.5)));

    // Twinkling sky dots (skipped on light themes).
    if (t.mode === 'dark') {
      const skyH = Math.max(1, groundRow - hillRows - 2);
      for (const d of SKY_DOTS) {
        const sx = Math.floor(d.x - camX * 0.25);
        if (sx < 0 || sx >= W) continue;
        const tw = 0.5 + 0.5 * Math.sin(simNow * 0.0021 + d.phase * 4);
        if (tw < 0.4) continue;
        const row = 1 + Math.floor(d.yf * skyH);
        ctx.blit(
          sx,
          row,
          d.big ? '+' : '·',
          tw > 0.82 ? pal.dotBright : pal.dotDim,
        );
      }
    }

    // Parallax hills sit on the ground line.
    drawHills(camX, pal, W, hillRows * 2).blitTo(
      ctx.state,
      0,
      groundRow - hillRows,
    );

    // --- Draw: goal rocket (behind tiles/player) --------------------------------
    {
      const lift = finished
        ? Math.min(H + 8, 3 * ((simNow - finishedAt) / 1000) ** 2)
        : 0;
      rocketCanvas.clear();
      drawSprite(
        rocketCanvas,
        ROCKET_PX,
        0,
        0,
        pal.rocketBody,
        pal.trim,
        pal.rocketWindow,
      );
      if (finished) {
        // Flicker a two-phase exhaust flame under the rocket.
        const phase = Math.floor(simNow / 66) % 2;
        const fa = phase === 0 ? pal.flameA : pal.flameB;
        const fb = phase === 0 ? pal.flameB : pal.flameA;
        rocketCanvas.set(2, 7, fa);
        rocketCanvas.set(1, 8, fb);
        rocketCanvas.set(3, 8, fb);
        rocketCanvas.set(2, 9, fa);
        if (phase === 0) rocketCanvas.set(2, 10, fb);
      }
      const feetPx = groundRow * 2 - Math.round(lift * 2);
      const topPx = feetPx - 7; // rocket bitmap is 7 px tall
      const cellY = Math.floor(topPx / 2);
      rocketCanvas.blitTo(ctx.state, GOAL_X - 2 - camXi, cellY);
    }

    // --- Draw: ground, pits, platforms ------------------------------------------
    ctx.rect(0, groundRow, W, 2, pal.voidFill); // pit voids under everything
    for (const seg of GROUND) {
      const sx = seg.x - camXi;
      const from = Math.max(sx, 0);
      const to = Math.min(sx + seg.w, W);
      if (to <= from) continue;
      ctx.blit(
        from,
        groundRow,
        CAP_GLYPHS.get(seg)!.substring(from - sx, to - sx),
        pal.groundCap,
      );
      ctx.rect(from, groundRow + 1, to - from, 1, pal.groundDeep);
    }
    for (const p of LEDGES) {
      const sx = p.x - camXi;
      const from = Math.max(sx, 0);
      const to = Math.min(sx + p.w, W);
      if (to <= from) continue;
      ctx.blit(
        from,
        groundRow - p.top,
        CAP_GLYPHS.get(p)!.substring(from - sx, to - sx),
        pal.platCap,
      );
    }

    // --- Draw: stars --------------------------------------------------------------
    const starGlyph = ctx.icon('star');
    for (let i = 0; i < STAR_SPOTS.length; i++) {
      if (collected[i]) continue;
      const s = STAR_SPOTS[i]!;
      const sx = Math.round(s.x) - camXi;
      if (sx < 0 || sx >= W) continue;
      const pulse = 0.5 + 0.5 * Math.sin(simNow * 0.004 + i * 1.7);
      pal.star.fg = pulse > 0.66 ? pal.starB : pal.starA;
      ctx.blit(sx, groundRow - s.top, starGlyph, pal.star);
    }

    // --- Draw: sparkles -------------------------------------------------------------
    for (const s of sparkles) {
      if (!s.active) continue;
      const age = (simNow - s.bornAt) / SPARKLE_LIFE_MS;
      if (age >= 1) {
        s.active = false;
        continue;
      }
      const cx = Math.round(s.x) - camXi;
      const cy = groundRow - Math.round(s.y) - 1;
      const radius = s.kind === 'star' ? 1 + age * 1.6 : 1 + age * 0.8;
      const glyph = age < 0.45 ? '+' : '·';
      pal.sparkle.fg = s.kind === 'star' ? pal.starB : pal.trim;
      const n = s.kind === 'star' ? BURST.length : 4;
      for (let i = 0; i < n; i++) {
        const [ox, oy] = BURST[i]!;
        ctx.blit(
          cx + Math.round(ox * radius),
          cy + Math.round(oy * radius),
          glyph,
          pal.sparkle,
        );
      }
    }

    // --- Draw: player (halfblock sprite with sub-cell vertical motion) --------------
    const blink =
      simNow - respawnedAt < 550 && Math.floor(simNow / 70) % 2 === 0;
    if (!blink) {
      const squashing = player.grounded && simNow < squashUntil;
      const frame: PlayerFrame = !player.grounded
        ? 'jump'
        : squashing
          ? 'squash'
          : Math.abs(player.vx) > 2
            ? Math.floor(runPhase) % 2 === 0
              ? 'runA'
              : 'runB'
            : 'idle';
      const sprite = FRAMES[frame];
      const spriteH = squashing ? 4 : 6;
      const feetPx = groundRow * 2 - Math.round(player.y * 2);
      const topPx = feetPx - spriteH;
      const cellY = Math.floor(topPx / 2);
      const innerOff = topPx - cellY * 2;
      const xOff = squashing ? 0 : 1;
      playerCanvas.clear();
      drawSprite(
        playerCanvas,
        sprite,
        xOff,
        innerOff,
        pal.body,
        pal.trim,
        pal.eye,
      );
      playerCanvas.blitTo(ctx.state, Math.round(player.x - camX) - 3, cellY);
    }

    // --- Draw: HUD --------------------------------------------------------------------
    const title = ` ${ctx.icon('rocket')} STARHOP`;
    ctx.blit(1, 0, title, pal.hudTitle);
    const elapsed =
      startedAt < 0 ? 0 : ((finished ? finishedAt : simNow) - startedAt) / 1000;
    const starText = `${starGlyph} ${score}/${STAR_SPOTS.length}`;
    const perfText =
      frameMs > 0
        ? `  ${elapsed.toFixed(1)}s  ${(1000 / frameMs).toFixed(0)}fps ${frameMs.toFixed(1)}ms `
        : `  ${elapsed.toFixed(1)}s  --fps `;
    const right = W - 1 - visibleWidth(starText) - visibleWidth(perfText);
    ctx.blit(right, 0, starText, pal.hudStar);
    ctx.blit(right + visibleWidth(starText), 0, perfText, pal.hudMuted);

    const hint = ' ←/→ move · space jump · 1/2/3 theme · r restart · q quit ';
    if (W >= hint.length + 2) ctx.blit(1, H - 1, hint, pal.hint);

    // --- Draw: clear overlay -------------------------------------------------------------
    if (finished && simNow - finishedAt > 700) {
      ctx.layer({ zIndex: 10, shadow: true }, (overlay) => {
        const perfect = score === STAR_SPOTS.length;
        overlay.box(
          {
            width: 34,
            height: 7,
            border: 'rounded',
            borderColor: t.primary,
            bgColor: t.surfaceRaised,
            align: 'center',
            valign: 'middle',
          },
          (b) => {
            b.text(
              ctx.color.bold(
                t.primary(perfect ? '★ PERFECT LAUNCH ★' : 'LAUNCHED!'),
              ),
            );
            b.text('\n');
            b.text(
              t.foreground(
                `${starGlyph} ${score}/${STAR_SPOTS.length} · ${elapsed.toFixed(1)}s`,
              ),
            );
            b.text('\n\n');
            b.text(t.muted('r replay · q quit'));
          },
        );
      });
    }
  },
  {
    fps: 60,
    keyboard: true,
    mouse: false,
    hideCursor: true,
    alternateBuffer: !once,
    theme: darkTheme,
    // Same policy as the other public demos (demo-layout.ts): assume a Nerd
    // Font terminal so the star/rocket-era glyphs render.
    nerdFont: true,
    once,
  },
);
