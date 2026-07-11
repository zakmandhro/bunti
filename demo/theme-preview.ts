/**
 * Bunti Theme Preview / Switcher (internal)
 *
 * The theme-switcher skeleton behind the launch hero demo: every screen
 * element is drawn from ctx.theme tokens, and number keys 1-8 swap between
 * the built-in themes and all six VS Code presets live via ctx.setTheme.
 *
 * Keys: 1-8 select a theme, q / Esc quit.
 * Headless: --once renders a single frame; --theme <name> picks the theme.
 */

import { darkTheme, lightTheme, render, type Theme } from '../src/index';
import { themes } from '../src/themes/index';

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

const once = process.argv.includes('--once');
const themeArg = process.argv[process.argv.indexOf('--theme') + 1];
const initial =
  (process.argv.includes('--theme') &&
    THEMES.find((t) => t.name === themeArg)) ||
  darkTheme;

render(
  (ctx) => {
    const t = ctx.theme;
    ctx.wallpaper(t.background);

    // Title bar on the raised surface.
    ctx.box(
      {
        x: 2,
        y: 1,
        width: 46,
        height: 3,
        border: 'none',
        bgColor: t.surfaceRaised,
        padding: [0, 2],
        valign: 'middle',
      },
      (b) => {
        b.text(t.primary('◆ '));
        b.text(t.foreground(t.name));
        b.text(t.muted(`  ·  ${t.mode} mode`));
      },
    );

    // Token samples on a surface panel.
    ctx.box(
      {
        x: 2,
        y: 5,
        width: 46,
        height: 6,
        border: 'rounded',
        borderColor: t.border,
        bgColor: t.surface,
        padding: [1, 2],
        title: 'Tokens',
        titleStyle: t.primary,
      },
      (b) => {
        b.text(t.primary('Primary'));
        b.text(t.muted(' | '));
        b.text(t.accent('Accent'));
        b.text(t.muted(' | '));
        b.text(t.foreground('Foreground'));
        b.text('\n');
        b.text(t.muted('muted caption text'));
      },
    );

    // Status colors on the raised surface.
    ctx.box(
      {
        x: 2,
        y: 12,
        width: 46,
        height: 3,
        border: 'rounded',
        borderColor: t.focus,
        bgColor: t.surfaceRaised,
        padding: [0, 2],
        title: 'Status',
        valign: 'middle',
      },
      (b) => {
        b.text(t.success('✓ pass'));
        b.text(t.muted('  '));
        b.text(t.warning('▲ warn'));
        b.text(t.muted('  '));
        b.text(t.danger('✗ fail'));
        b.text(t.muted('  '));
        b.text(t.info('● info'));
      },
    );

    // Button look: primary background + onPrimary text.
    ctx.box(
      {
        x: 2,
        y: 16,
        width: 22,
        height: 3,
        border: 'none',
        bgColor: t.primary,
        color: t.onPrimary,
        align: 'center',
        valign: 'middle',
      },
      (b) => {
        b.text('Launch Mission');
      },
    );

    // Selection swatch next to the button.
    ctx.box(
      {
        x: 26,
        y: 16,
        width: 22,
        height: 3,
        border: 'none',
        bgColor: t.selection,
        color: t.foreground,
        align: 'center',
        valign: 'middle',
      },
      (b) => {
        b.text('selected row');
      },
    );

    ctx.blit(
      2,
      20,
      t.muted(
        THEMES.map((theme, i) => `[${i + 1}] ${theme.name}`)
          .slice(0, 4)
          .join('  '),
      ),
    );
    ctx.blit(
      2,
      21,
      t.muted(
        THEMES.map((theme, i) => `[${i + 1}] ${theme.name}`)
          .slice(4)
          .join('  '),
      ),
    );
    ctx.blit(2, 22, t.muted('[q] quit'));

    const pick = Number.parseInt(ctx.lastKey ?? '', 10);
    if (pick >= 1 && pick <= THEMES.length) ctx.setTheme(THEMES[pick - 1]!);
    if (ctx.lastKey === 'q' || ctx.lastKey === 'escape') ctx.requestStop();
  },
  {
    keyboard: true,
    hideCursor: true,
    alternateBuffer: !once,
    theme: initial,
    once,
  },
);
