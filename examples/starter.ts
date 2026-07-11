/**
 * Bunti starter — the pit-of-success dashboard template.
 *
 *   bun add @zakmandhro/bunti
 *   bun starter.ts        (run in a real terminal; keyboard needs a TTY)
 *
 * The mental model: render() calls this callback every frame. Redraw the
 * whole screen from state each time — Bunti diffs the buffers and writes
 * only the changed cells. State lives in ctx.useState(key, initial).
 */

import { render } from '@zakmandhro/bunti';
import { Progress, Spinner } from '@zakmandhro/bunti/components';

const SIDEBAR_W = 24;

const AGENTS = [
  { name: 'planner', status: 'ready' },
  { name: 'builder', status: 'running' },
  { name: 'reviewer', status: 'ready' },
  { name: 'deployer', status: 'idle' },
];

await render(
  (ctx) => {
    const { theme } = ctx;

    // -- input first: derive this frame's state from keys ----------------
    if (ctx.lastKey === 'q') ctx.requestStop();
    const [selected, setSelected] = ctx.useState('selected', 0);
    if (ctx.keyPressed('up')) setSelected(Math.max(0, selected - 1));
    if (ctx.keyPressed('down')) {
      setSelected(Math.min(AGENTS.length - 1, selected + 1));
    }

    // -- chrome -----------------------------------------------------------
    ctx.wallpaper(theme.background);
    ctx.box(
      { anchor: 'top', height: 1, bgColor: theme.surfaceRaised },
      (bar) => {
        bar.text(theme.accent(` ${ctx.icon('rocket')} `));
        bar.text(theme.foreground('MISSION CONTROL'));
        bar.text(theme.muted('  ·  up/down select · q quit'));
      },
    );

    // -- layout: split the content area into sidebar + main tracks -------
    // Coordinates are cells; boxes placed at the root paint directly to
    // the screen (and center themselves unless you pass x/y).
    const [side, main] = ctx.split({
      direction: 'horizontal',
      constraints: [SIDEBAR_W, '1fr'],
    });

    ctx.box(
      {
        x: side!.x,
        y: 2,
        width: side!.width,
        height: ctx.height - 3,
        border: 'rounded',
        borderColor: theme.border,
        title: 'AGENTS',
        titleStyle: theme.muted,
        padding: [1, 1],
      },
      (panel) => {
        for (const [i, agent] of AGENTS.entries()) {
          const row = i === selected ? theme.focus : theme.foreground;
          const mark = i === selected ? '>' : ' ';
          panel.text(row(`${mark} ${agent.name.padEnd(12)}`));
          panel.text(theme.muted(`${agent.status}\n`));
        }
      },
    );

    ctx.box(
      {
        x: main!.x,
        y: 2,
        width: main!.width,
        height: ctx.height - 3,
        border: 'rounded',
        borderColor: theme.border,
        title: AGENTS[selected]!.name.toUpperCase(),
        titleStyle: theme.accent,
        padding: [1, 2],
      },
      (panel) => {
        Spinner(panel, { label: 'streaming telemetry' });
        panel.text('\n\n');
        panel.text(theme.muted('progress '));
        // Time-based animation: fps-independent, smooth at any frame rate.
        Progress(panel, {
          value: ctx.animate(4000, { loop: true }),
          width: Math.max(10, panel.width - 12),
          showPercent: true,
        });
        panel.text('\n\n');
        panel.text(theme.success(`${ctx.icon('check')} all systems nominal`));
      },
    );

    // Anything that must OVERLAP other content goes on a layer:
    // ctx.layer(10, (overlay) => overlay.box({ ... }, drawModal));
  },
  {
    fps: 60,
    keyboard: true,
    mouse: true,
    alternateBuffer: true,
    hideCursor: true,
  },
);
