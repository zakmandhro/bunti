/**
 * Animation Sequence demo — dogfoods the motion minimum:
 * - animate() with easing curves
 * - stagger() cascading entrances (restartable id clock)
 * - transition() enter/exit progress (SPACE toggles the status overlay)
 * - restartAnimation() timeline restarts (no componentState poking)
 * - time-based flicker() and the dt/frame counters
 */

import { Box } from '../src/components';
import type { BuntiContext } from '../src/dsl';
import { easeOutBack, easeOutCubic, lerp } from '../src/index';
import { demo } from './demo-layout';

const LOGO = [
  ' ┏┓  ┳ ┳ ┏┓┓ ┏┳┓ ┳ ',
  ' ┣┻┓ ┃ ┃ ┃┃┃  ┃  ┃ ',
  ' ┗━┛ ┗━┛ ┛┗┛  ┻  ┻ ',
];

const TIMELINE_IDS = [
  'container',
  'progress',
  'bunti-logo',
  'boot-copy',
  'restart-hint',
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
      for (const id of TIMELINE_IDS) ctx.restartAnimation(id);
    }

    const [showStatus, setShowStatus] = ctx.useState('show-status', false);
    if (lastKey === ' ') setShowStatus(!showStatus);

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

    const containerProgress = ctx.animate(650, {
      id: 'container',
      easing: easeOutCubic,
    });
    const progress = ctx.animate(1800, {
      id: 'progress',
      loop: true,
      delay: 650,
    });
    const logoProgress = ctx.animate(900, { id: 'bunti-logo', delay: 650 });
    const hintProgress = ctx.animate(650, {
      id: 'restart-hint',
      delay: 2850,
      easing: easeOutCubic,
    });
    const logoReady = logoProgress >= 1;
    const showLogo = logoReady || ctx.flicker(0.72, { id: 'logo-boot' });
    const pulse = ctx.animate(440, { loop: 'yoyo' });
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

        // Staggered cascade: each logo line rides its own slice of the
        // 'bunti-logo' clock, so ENTER replays the whole cascade.
        // (+4 index slots ≈ 640ms base delay so the container lands first.)
        LOGO.forEach((line, index) => {
          const lineProgress = ctx.stagger(index + 4, {
            id: 'bunti-logo',
            delay: 160,
            duration: 520,
            easing: easeOutCubic,
          });
          sub.text(
            showLogo
              ? gradientLogoLine(ctx, line, lineProgress, muted)
              : ' '.repeat(line.length),
          );
          sub.text('\n');
        });

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

    // Status overlay: transition() keeps it mounted through the exit leg,
    // so it slides/fades out instead of vanishing.
    const status = ctx.transition('status-overlay', showStatus, {
      duration: 320,
      exitDuration: 220,
      easing: easeOutBack,
    });
    if (status.mounted) {
      const overlayW = Math.min(34, Math.max(24, panel.width - 12));
      const overlayX = panel.x + Math.floor((panel.width - overlayW) / 2);
      const overlayY = Math.round(
        lerp(panel.y + panel.height + 2, panel.y + 3, status.progress),
      );
      const overlayBorder = ctx.fade('#0a0a0b', '#39d7ff', status.progress);
      const overlayText = ctx.fade('#0a0a0b', '#e8ecf4', status.progress);

      ctx.layer(10, (layer) => {
        layer.box(
          {
            x: overlayX,
            y: overlayY,
            width: overlayW,
            height: 6,
            border: 'rounded',
            borderColor: overlayBorder,
            bgColor: '#101426',
            padding: [0, 2],
            align: 'left',
            title: 'STATUS',
          },
          (sub) => {
            sub.text(color.fg(overlayText, `frame     ${ctx.frame}`));
            sub.text('\n');
            sub.text(color.fg(overlayText, `dt        ${ctx.dt}ms`));
            sub.text('\n');
            sub.text(
              color.fg(overlayText, `elapsed   ${Math.round(elapsedTime)}ms`),
            );
            sub.text('\n');
            sub.text(color.fg(overlayText, 'SPACE to dismiss'));
          },
        );
      });
    }

    const hint = 'ENTER restart  |  SPACE status  |  q quit';
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
    footer: false,
  },
);
