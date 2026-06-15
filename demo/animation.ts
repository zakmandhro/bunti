import { Box } from '../src/components';
import type { BuntiContext } from '../src/dsl';
import { demo } from './demo-layout';

const LOGO = [
  ' ┏┓  ┳ ┳ ┏┓┓ ┏┳┓ ┳ ',
  ' ┣┻┓ ┃ ┃ ┃┃┃  ┃  ┃ ',
  ' ┗━┛ ┗━┛ ┛┗┛  ┻  ┻ ',
];

function gradientLogoLine(
  ctx: BuntiContext,
  line: string,
  progress: number,
  muted: { r: number; g: number; b: number },
) {
  return Array.from(line)
    .map((char, index) => {
      if (char === ' ') return char;

      const phase = index / Math.max(1, line.length - 1);
      const target =
        phase < 0.5
          ? ctx.fade('#39d7ff', '#bd5cff', phase * 2)
          : ctx.fade('#bd5cff', '#ffe66d', (phase - 0.5) * 2);

      return ctx.color.fg(ctx.fade(muted, target, progress), char);
    })
    .join('');
}

demo(
  'Animation Sequence',
  (ctx, bounds) => {
    const { color, elapsedTime, lastKey, requestStop } = ctx;
    if (lastKey === 'q') requestStop();
    if (lastKey === 'enter') {
      const now = Date.now();
      ctx.state.componentState.set('container_start', now);
      ctx.state.componentState.set('progress_start', now);
      ctx.state.componentState.set('bunti-logo_start', now);
      ctx.state.componentState.set('boot-copy_start', now);
      ctx.state.componentState.set('restart-hint_start', now);
    }

    const panelWidth = Math.min(Math.max(bounds.w - 4, 28), 76);
    const panel = bounds.place({
      y: Math.max(1, Math.floor(bounds.h / 2) - 7),
      width: panelWidth,
      height: Math.min(Math.max(bounds.h - 2, 12), 15),
    });
    const innerX = panel.x + 2;
    const innerY = panel.y + 1;
    const innerW = Math.max(1, panel.width - 4);
    const innerH = Math.max(1, panel.height - 2);

    const containerProgress = ctx.animate(650, { id: 'container' });
    const progress = ctx.animate(1800, {
      id: 'progress',
      loop: true,
      delay: 650,
    });
    const logoProgress = ctx.animate(900, { id: 'bunti-logo', delay: 650 });
    const hintProgress = ctx.animate(650, {
      id: 'restart-hint',
      delay: 2850,
    });
    const logoReady = logoProgress >= 1;
    const showLogo = logoReady || ctx.flicker(0.72);
    const pulse = Math.sin(elapsedTime / 220) * 0.5 + 0.5;
    const amber = ctx.rgb(255, Math.floor(170 + pulse * 70), 40);
    const muted = { r: 92, g: 98, b: 112 };
    const panelBg = ctx.fade('#0a0a0b', '#101118', containerProgress);
    const innerBg = ctx.fade('#0a0a0b', '#151724', containerProgress);
    const trackBg = ctx.fade('#0a0a0b', '#202338', containerProgress);
    const borderColor = ctx.fade(
      '#0a0a0b',
      logoReady ? 'mint' : 'gray',
      containerProgress,
    );
    const typed = ctx.typewriter('Bunti features terminal animations', {
      id: 'boot-copy',
      cps: 28,
      delay: 1550,
      cursor: '█',
    });

    ctx.rect(panel.x, panel.y, panel.width, panel.height, {
      char: ' ',
      bg: panelBg,
    });
    ctx.rect(innerX, innerY, innerW, innerH, {
      char: ' ',
      bg: innerBg,
    });
    ctx.rect(innerX, panel.y + panel.height - 3, innerW, 1, {
      char: ' ',
      bg: trackBg,
    });
    for (let x = 0; x < innerW; x++) {
      const phase = (x / innerW + progress) % 1;
      const bg =
        phase < 0.33
          ? ctx.fade('#39d7ff', '#bd5cff', phase / 0.33)
          : phase < 0.66
            ? ctx.fade('#bd5cff', '#ffe66d', (phase - 0.33) / 0.33)
            : ctx.fade('#ffe66d', '#39d7ff', (phase - 0.66) / 0.34);

      ctx.rect(innerX + x, panel.y + panel.height - 3, 1, 1, {
        char: ' ',
        bg,
      });
    }

    Box(
      ctx,
      {
        x: panel.x,
        y: panel.y,
        width: panel.width,
        height: panel.height,
        border: 'rounded',
        borderColor,
        padding: [1, 2],
        align: 'center',
        valign: 'middle',
      },
      (sub) => {
        sub.text(color.cyan(color.bold('BOOT SEQUENCE')));
        sub.text('\n\n');

        for (const line of LOGO) {
          sub.text(
            showLogo
              ? gradientLogoLine(ctx, line, logoProgress, muted)
              : ' '.repeat(line.length),
          );
          sub.text('\n');
        }

        sub.text('\n');
        sub.text(
          logoReady
            ? color.fg(amber, '>>> SYSTEMS READY <<<')
            : color.fg(muted, 'Booting systems...'),
        );
        sub.text('\n');
        sub.text(color.fg(typed.done ? 'mint' : 'silver', typed.text));
        sub.text(color.fg(amber, typed.cursor));
      },
    );

    const hint = 'ENTER to restart animation  |  q to quit';
    ctx.blit(
      panel.x + Math.max(0, Math.floor((panel.width - hint.length) / 2)),
      panel.y + panel.height + 1,
      color.fg(
        ctx.fade('#0a0a0b', { r: 96, g: 102, b: 118 }, hintProgress),
        hint,
      ),
    );
  },
  {
    fps: 20,
    alternateBuffer: true,
    hideCursor: true,
    nerdFont: true,
    keyboard: true,
    mouse: true,
  },
);
