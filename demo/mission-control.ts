/**
 * Agent Fleet Mission Control — the Bunti launch hero demo.
 *
 * A fleet of AI coding agents working tasks across repos: live agent list,
 * task detail with gradient progress + tokens/min sparkline, and a streaming
 * activity log. Every cell is painted from ctx.theme tokens, so number keys
 * 1-8 restyle the whole dashboard live via ctx.setTheme.
 *
 * Keys: 1-8 themes · up/down or click to select an agent · q quit.
 * Headless: --once renders a single frame; --size 100x32 fakes a viewport.
 */

import { Progress, Spinner } from '../src/components';
import {
  darkTheme,
  easeOutCubic,
  lightTheme,
  type RGB,
  render,
  type Theme,
  type ThemeColor,
  truncate,
  visibleWidth,
} from '../src/index';
import { themes } from '../src/themes/index';

// --- CLI flags (headless testing / recording) -------------------------------

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

const THEMES: Theme[] = [
  darkTheme,
  lightTheme,
  themes.dracula!,
  themes['tokyo-night']!,
  themes['catppuccin-mocha']!,
  themes.nord!,
  themes['one-dark-pro']!,
  themes['github-light']!,
];

// --- Fleet simulation --------------------------------------------------------

type Status = 'coding' | 'review' | 'blocked' | 'idle';

interface Agent {
  name: string;
  repo: string;
  branch: string;
  task: string;
  status: Status;
  progress: number;
  rate: number; // tokens/min
  history: number[]; // rolling rate series (reused array)
  tokens: number;
  files: number;
  startedAt: number;
}

interface FleetEvent {
  ts: string;
  kind: 'commit' | 'tests' | 'merge' | 'ship' | 'stall' | 'plan';
  agent: string;
  msg: string;
  born: number;
}

const TASKS = [
  'refactoring theme engine',
  'wiring OAuth callbacks',
  'chasing a flaky e2e suite',
  'tuning the diff renderer',
  'porting the icons pipeline',
  'writing migration codemods',
  'profiling the render loop',
  'reviewing PR #214',
  'drafting release notes',
  'untangling circular imports',
];

const agents: Agent[] = [
  ['nova', 'bunti', 'feat/motion-engine', 'coding'],
  ['luna', 'lit-factory', 'feat/agent-inbox', 'coding'],
  ['sona', 'pullflow-web', 'fix/review-sync', 'review'],
  ['atlas', 'space-station', 'chore/planet-gc', 'coding'],
  ['vega', 'bunti-docs', 'docs/quickstart', 'idle'],
  ['orion', 'gstack', 'fix/browse-daemon', 'blocked'],
  ['mira', 'lit-factory', 'feat/task-router', 'coding'],
].map(([name, repo, branch, status], i) => ({
  name: name as string,
  repo: repo as string,
  branch: branch as string,
  task: TASKS[i % TASKS.length]!,
  status: status as Status,
  progress: 0.15 + i * 0.11,
  rate: 90 + i * 25,
  history: [] as number[],
  tokens: 180_000 + i * 90_000,
  files: 3 + (i % 6),
  startedAt: Date.now() - (i + 2) * 7 * 60_000,
}));

const events: FleetEvent[] = [];
const fleetHistory: number[] = [];
const HISTORY_CAP = 48;
const EVENT_CAP = 48;
let taskCursor = agents.length;

const clock = (d = new Date()) => d.toTimeString().slice(0, 8);

function pushEvent(kind: FleetEvent['kind'], agent: string, msg: string) {
  events.push({ ts: clock(), kind, agent, msg, born: Date.now() });
  if (events.length > EVENT_CAP) events.shift();
}

const CHATTER: [FleetEvent['kind'], (a: Agent) => string][] = [
  ['commit', (a) => `pushed 2 commits to ${a.branch}`],
  ['tests', (a) => `${a.repo} suite green in 41s`],
  ['plan', (a) => `split "${a.task}" into 3 steps`],
  ['commit', (a) => `rebased ${a.branch} on main`],
  ['merge', (a) => `merged PR #${180 + (((a.tokens / 1000) | 0) % 90)}`],
  ['tests', (a) => `added 6 cases for ${a.repo}`],
];

function chatter() {
  const a = agents[Math.floor(Math.random() * agents.length)]!;
  if (a.status === 'blocked') {
    pushEvent('stall', a.name, `waiting on CI for ${a.branch}`);
  } else {
    const [kind, msg] = CHATTER[Math.floor(Math.random() * CHATTER.length)]!;
    pushEvent(kind, a.name, msg(a));
  }
}

function tick(): number {
  let fleetRate = 0;
  for (const a of agents) {
    const active = a.status === 'coding' || a.status === 'review';
    if (active) {
      a.progress += 0.02 + Math.random() * 0.05;
      a.rate = Math.min(
        320,
        Math.max(45, a.rate + (Math.random() - 0.48) * 46),
      );
      a.tokens += (a.rate / 60) * 0.9 * 1000;
    } else {
      a.rate = Math.max(12, a.rate * 0.86);
    }
    fleetRate += a.rate;
    a.history.push(a.rate);
    if (a.history.length > HISTORY_CAP) a.history.shift();

    if (a.progress >= 1) {
      pushEvent('ship', a.name, `shipped "${a.task}"`);
      a.progress = 0;
      a.task = TASKS[taskCursor++ % TASKS.length]!;
      a.files = 2 + Math.floor(Math.random() * 9);
      a.startedAt = Date.now();
      if (a.status === 'review') a.status = 'coding';
    }
  }
  fleetHistory.push(fleetRate);
  if (fleetHistory.length > HISTORY_CAP) fleetHistory.shift();

  if (Math.random() < 0.85) chatter();
  if (Math.random() < 0.35) chatter();
  return Date.now();
}

// Seed histories + a first screen of log lines so frame one is never empty.
for (let i = 0; i < 24; i++) {
  let fleetRate = 0;
  for (const a of agents) {
    const sample = a.rate + Math.sin(i * 0.7 + a.rate) * 30;
    a.history.push(sample);
    fleetRate += sample;
  }
  fleetHistory.push(fleetRate);
}
pushEvent('plan', 'nova', 'fleet online — 7 agents reporting');
pushEvent('commit', 'luna', 'pushed 2 commits to feat/agent-inbox');
pushEvent('tests', 'atlas', 'space-station suite green in 38s');
pushEvent('merge', 'sona', 'merged PR #209 into pullflow-web');
pushEvent('commit', 'mira', 'rebased feat/task-router on main');

// --- Small render helpers ----------------------------------------------------

const SPARK = '▁▂▃▄▅▆▇█';

function sparkline(series: number[], width: number): string {
  const n = Math.min(width, series.length);
  if (n === 0) return '';
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = series.length - n; i < series.length; i++) {
    const v = series[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  let out = '';
  for (let i = series.length - n; i < series.length; i++) {
    out += SPARK[Math.round(((series[i]! - min) / span) * 7)];
  }
  return out;
}

const fmtTokens = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}k`;

function fmtUptime(since: number): string {
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${s % 60}s`;
}

const STATUS_META: Record<
  Status,
  { icon: string; token: keyof Theme & string; label: string }
> = {
  coding: { icon: 'robot', token: 'info', label: 'coding' },
  review: { icon: 'pr', token: 'accent', label: 'review' },
  blocked: { icon: 'warning', token: 'warning', label: 'blocked' },
  idle: { icon: 'pause', token: 'muted', label: 'idle' },
};

const EVENT_META: Record<
  FleetEvent['kind'],
  { icon: string; token: keyof Theme & string }
> = {
  commit: { icon: 'commit', token: 'info' },
  tests: { icon: 'check', token: 'success' },
  merge: { icon: 'merge', token: 'accent' },
  ship: { icon: 'rocket', token: 'primary' },
  stall: { icon: 'warning', token: 'warning' },
  plan: { icon: 'list', token: 'muted' },
};

// --- The dashboard -----------------------------------------------------------

render(
  (ctx) => {
    const t = ctx.theme;
    const { width: W, height: H, color, icon } = ctx;
    ctx.wallpaper(t.background);

    // Input -------------------------------------------------------------
    if (ctx.lastKey === 'q' || ctx.lastKey === 'escape') ctx.requestStop();
    if (ctx.lastKey === 'r') ctx.restartAnimation('entrance');
    const pick = Number.parseInt(ctx.lastKey ?? '', 10);
    if (pick >= 1 && pick <= THEMES.length) ctx.setTheme(THEMES[pick - 1]!);

    if (W < 72 || H < 20) {
      const msg = 'mission control needs at least 72x20';
      ctx.blit(Math.max(0, (W - msg.length) >> 1), H >> 1, t.muted(msg));
      return;
    }

    // Simulation heartbeat (useAsync-fed fake telemetry) -----------------
    ctx.useAsync('fleet-tick', async () => tick(), { interval: 900 });

    // Entrance choreography ----------------------------------------------
    // Panels stagger in over the first second; theme swaps later restyle
    // in place (no replay), and `r` replays the cascade (the 'entrance' id
    // clock). --once skips it so a single frame shows the full UI.
    const enter = (i: number) =>
      once
        ? 1
        : ctx.stagger(i + 1, {
            id: 'entrance',
            delay: 150,
            duration: 240,
            easing: easeOutCubic,
          });
    const mix = (token: ThemeColor, p: number): RGB =>
      p >= 1 ? token.rgb : ctx.fade(t.background.rgb, token.rgb, p);
    const ink =
      (token: ThemeColor, p: number) =>
      (s: string): string =>
        color.fg(mix(token, p), s);

    // Geometry ------------------------------------------------------------
    const margin = W >= 100 ? 2 : 1;
    const wide = W >= 100;
    const headerH = 3;
    const bodyY = headerH + 1;
    const bodyH = H - bodyY - 2;
    const leftW = wide ? 34 : 27;
    const body = { x: margin, y: bodyY, width: W - margin * 2, height: bodyH };
    const fleet = { x: body.x, y: body.y, width: leftW, height: body.height };
    const right = {
      x: body.x + leftW + 2,
      y: body.y,
      width: body.width - leftW - 2,
      height: body.height,
    };
    const detailH = H >= 32 ? 12 : 9;
    const logY = right.y + detailH + 1;
    const logH = right.height - detailH - 1;

    // Selection (shared state key with the agents list) -------------------
    const [selected] = ctx.useState('agents_index', 0);
    const agent = agents[Math.min(selected, agents.length - 1)]!;
    const [prevSel, setPrevSel] = ctx.useState('detail_prev', selected);
    if (prevSel !== selected) {
      setPrevSel(selected);
      ctx.restartAnimation('detail-fade');
    }
    const swap = ctx.animate(220, { id: 'detail-fade', easing: easeOutCubic });

    // 1 · Header bar -------------------------------------------------------
    const pHeader = enter(0);
    ctx.box(
      {
        x: 0,
        y: 0,
        width: W,
        height: headerH,
        border: 'none',
        bgColor: mix(t.surfaceRaised, pHeader),
        padding: [0, margin + 1],
        valign: 'middle',
      },
      (b) => {
        if (pHeader < 0.5) return;
        const left = `${icon('bunti')} `;
        const leftTitle = 'AGENT FLEET';
        const leftSub = '  mission control';
        const rightPlain = `. fleet live  ${clock()}  ·  ${t.name}`;
        const pad = Math.max(
          1,
          W -
            (margin + 1) * 2 -
            visibleWidth(left + leftTitle + leftSub) -
            visibleWidth(rightPlain),
        );
        b.text(ink(t.primary, pHeader)(left));
        b.text(color.bold(ink(t.foreground, pHeader)(leftTitle)));
        b.text(ink(t.muted, pHeader)(leftSub));
        b.text(' '.repeat(pad));
        Spinner(b, { label: '', color: mix(t.accent, pHeader) });
        b.text(ink(t.success, pHeader)(' fleet live'));
        b.text(ink(t.muted, pHeader)(`  ${clock()}  ·  `));
        b.text(ink(t.accent, pHeader)(t.name));
      },
    );

    // 2 · Agent list --------------------------------------------------------
    const pFleet = enter(1);
    const fleetY = fleet.y + Math.round((1 - pFleet) * 2);
    ctx.box(
      {
        x: fleet.x,
        y: fleetY,
        width: fleet.width,
        height: fleet.height,
        border: 'rounded',
        borderColor: mix(t.border, pFleet),
        title: ' Agents ',
        titleStyle: ink(t.muted, pFleet),
        bgColor: mix(t.surface, pFleet),
        padding: [1, 2],
      },
      (b) => {
        if (pFleet < 0.6) return;
        const inner = fleet.width - 6;
        const repoW = Math.max(6, inner - 16);
        const rows = agents.map((a) => {
          const meta = STATUS_META[a.status];
          const working = a.status === 'coding' || a.status === 'review';
          const pct = working
            ? `${String(Math.round(a.progress * 100)).padStart(3)}%`
            : '  · ';
          const name = working ? t.foreground : t.muted;
          return (
            `${(t[meta.token] as ThemeColor)(icon(meta.icon))} ` +
            `${name(a.name.padEnd(7))}` +
            `${t.muted(truncate(a.repo, repoW).padEnd(repoW))} ` +
            `${t.muted(pct)}`
          );
        });
        b.list('agents', rows, { width: '100%' });

        // Fleet throughput block, pinned to the panel's bottom edge.
        const innerH = fleet.height - 4;
        const pad = innerH - agents.length - 3;
        if (pad >= 1) {
          const active = agents.filter((a) => a.status !== 'idle').length;
          const counts = `${active}/${agents.length} active`;
          const label = wide ? 'FLEET THROUGHPUT' : 'FLEET';
          b.text('\n'.repeat(pad + 1));
          b.text(t.muted(label));
          b.text(' '.repeat(Math.max(1, inner - label.length - counts.length)));
          b.text(t.muted(counts));
          b.text('\n');
          b.text(t.info(sparkline(fleetHistory, inner)));
          b.text('\n');
          const sum = fleetHistory[fleetHistory.length - 1] ?? 0;
          b.text(t.muted('Σ '));
          b.text(t.foreground(`${Math.round(sum)}`));
          b.text(t.muted(' tok/min'));
        }
      },
    );

    // 3 · Mission detail ----------------------------------------------------
    const pDetail = enter(2);
    const detailY = right.y + Math.round((1 - pDetail) * 2);
    ctx.box(
      {
        x: right.x,
        y: detailY,
        width: right.width,
        height: detailH,
        border: 'rounded',
        borderColor: mix(t.border, pDetail),
        title: ' Mission Detail ',
        titleStyle: ink(t.muted, pDetail),
        bgColor: mix(t.surface, pDetail),
        padding: [1, 2],
      },
      (b) => {
        if (pDetail < 0.6) return;
        const dw = right.width - 6;
        const rows = detailH - 4; // inner rows between border + padding
        const meta = STATUS_META[agent.status];
        const statusInk = ink(t[meta.token] as ThemeColor, swap);
        const fgInk = ink(t.foreground, swap);
        const mutedInk = ink(t.muted, swap);
        const barW = Math.max(10, dw - 16);

        b.text(color.bold(ink(t.primary, swap)(agent.name)));
        b.text(mutedInk('  ·  '));
        b.text(statusInk(`${icon(meta.icon)} ${meta.label}`));
        b.text('\n');
        b.text(fgInk(truncate(agent.task, dw)));
        b.text('\n');
        b.text(
          mutedInk(
            truncate(
              `${icon('repo')} ${agent.repo}   ${icon('branch')} ${agent.branch}`,
              dw,
            ),
          ),
        );
        b.text('\n');
        if (rows >= 6) b.text('\n');

        b.text(mutedInk('progress  '));
        Progress(b, {
          value:
            agent.status === 'coding' || agent.status === 'review'
              ? agent.progress
              : 0,
          width: barW,
          gradient: [t.primary, t.accent],
          trackColor: mix(t.border, Math.min(pDetail, swap)),
          showPercent: true,
        });
        b.text('\n');

        if (rows >= 8 && wide) {
          b.text(mutedInk('tok/min   '));
          b.text(ink(t.accent, swap)(sparkline(agent.history, barW)));
          b.text(color.bold(fgInk(`  ${Math.round(agent.rate)}`)));
          b.text('\n');
        }
        if (rows >= 7) b.text('\n');
        const sep = rows >= 7 ? '   ·   ' : ' · ';
        b.text(
          mutedInk(
            `tokens ${fmtTokens(agent.tokens)}${sep}files ${agent.files}${sep}up ${fmtUptime(agent.startedAt)}`,
          ),
        );
      },
    );

    // 4 · Activity log --------------------------------------------------------
    const pLog = enter(3);
    const logYAnim = logY + Math.round((1 - pLog) * 2);
    ctx.box(
      {
        x: right.x,
        y: logYAnim,
        width: right.width,
        height: logH,
        border: 'rounded',
        borderColor: mix(t.border, pLog),
        title: ' Activity ',
        titleStyle: ink(t.muted, pLog),
        bgColor: mix(t.surface, pLog),
        padding: [1, 2],
      },
      (b) => {
        if (pLog < 0.6) return;
        const lw = right.width - 6;
        const visible = Math.max(1, logH - 4);
        const shown = events.slice(-visible);
        const now = Date.now();
        for (let i = 0; i < shown.length; i++) {
          const e = shown[i]!;
          const meta = EVENT_META[e.kind];
          // New lines slide in from the left over ~240ms of their life.
          const pe = Math.min(1, (now - e.born) / 240);
          const slide = ' '.repeat(Math.round((1 - easeOutCubic(pe)) * 6));
          const head = `${e.ts}  `;
          const badge = `${icon(meta.icon)} ${e.kind.padEnd(7)}`;
          const who = `${e.agent.padEnd(7)}`;
          const room = lw - slide.length - head.length - 9 - who.length;
          b.text(slide);
          b.text(t.muted(head));
          b.text((t[meta.token] as ThemeColor)(badge));
          b.text(t.foreground(who));
          b.text(t.muted(truncate(e.msg, Math.max(4, room))));
          if (i < shown.length - 1) b.text('\n');
        }
      },
    );

    // 5 · Keybar ----------------------------------------------------------------
    const pBar = enter(4);
    if (pBar > 0) {
      const idx = THEMES.findIndex((th) => th.name === t.name) + 1;
      const hint = '1-8 themes · ↑/↓ or click agents · q quit';
      const status = `${idx > 0 ? idx : '·'}/8 ${t.name}`;
      ctx.blit(margin + 1, H - 1, ink(t.muted, pBar)(hint));
      ctx.blit(
        Math.max(0, W - margin - 1 - visibleWidth(status)),
        H - 1,
        ink(t.accent, pBar)(status),
      );
    }
  },
  {
    fps: 30,
    keyboard: true,
    mouse: true,
    hideCursor: true,
    alternateBuffer: !once,
    theme: darkTheme,
    once,
  },
);
