/**
 * Bunti Theme Preview (internal)
 *
 * Minimal proof of the semantic theme system: three boxes rendered entirely
 * from ctx.theme tokens. Press 1 for dark, 2 for light (live setTheme swap),
 * q / Esc to quit. Pass --once for a single headless frame.
 */

import { darkTheme, lightTheme, render } from '../src/index';

const once = process.argv.includes('--once');

render(
  (ctx) => {
    const t = ctx.theme;
    ctx.wallpaper(t.background);

    ctx.box(
      {
        x: 2,
        y: 1,
        width: 46,
        height: 6,
        border: 'rounded',
        borderColor: t.border,
        bgColor: t.surface,
        padding: [1, 2],
        title: `Theme: ${t.name}`,
        titleStyle: t.primary,
      },
      (b) => {
        b.text(t.primary('Primary'));
        b.text(t.muted('  |  '));
        b.text(t.accent('Accent'));
        b.text(t.muted('  |  '));
        b.text(t.foreground('Foreground'));
        b.text('\n');
        b.text(t.muted('muted caption text'));
      },
    );

    ctx.box(
      {
        x: 2,
        y: 8,
        width: 46,
        height: 5,
        border: 'rounded',
        borderColor: t.border,
        bgColor: t.surfaceRaised,
        padding: [1, 2],
        title: 'Status',
      },
      (b) => {
        b.text(t.success('OK'));
        b.text(t.muted('  '));
        b.text(t.warning('WARN'));
        b.text(t.muted('  '));
        b.text(t.danger('FAIL'));
        b.text(t.muted('  '));
        b.text(t.info('INFO'));
      },
    );

    ctx.box(
      {
        x: 2,
        y: 14,
        width: 46,
        height: 3,
        border: 'none',
        bgColor: t.primary,
        color: 'blank',
        align: 'center',
        valign: 'middle',
      },
      (b) => {
        b.text('blank auto-contrast on primary');
      },
    );

    ctx.blit(2, 18, t.muted('[1] dark   [2] light   [q] quit'));

    if (ctx.lastKey === '1') ctx.setTheme(darkTheme);
    if (ctx.lastKey === '2') ctx.setTheme(lightTheme);
    if (ctx.lastKey === 'q' || ctx.lastKey === 'escape') ctx.requestStop();
  },
  {
    keyboard: true,
    hideCursor: true,
    alternateBuffer: !once,
    theme: darkTheme,
    once,
  },
);
