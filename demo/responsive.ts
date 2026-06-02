import { bunti } from '../src/index';

/**
 * Bunti Responsive Standard
 * Consolidating Fluid Grid Shifting, Min-Width constraints, and Surgical Wrapping.
 */

bunti.render(
  ({ wallpaper, box, color, width, height, blit, icon }) => {
    wallpaper(233);

    // 1. Header
    const header = ` ${color.bold(color.white('BUNTI :: RESPONSIVE FLUIDITY'))} `;
    blit(Math.floor((width - header.length) / 2), 1, color.bgGreen(header));

    const isSmall = width < 70;

    // Box 1: Surgical Wrapping + Min-Width
    box(
      {
        x: 2,
        y: 4,
        width: isSmall ? width - 4 : Math.floor(width * 0.45),
        minWidth: 30,
        wrap: true,
        border: 'frame',
        borderColor: color.green,
        bgColor: 233,
        title: ' WRAPPING + MIN-WIDTH ',
      },
      ({ span, text }) => {
        span({ color: color.bold }, ({ text }) =>
          text(` ${icon('info')} BREAKOUT TEST\n\n`),
        );
        text(
          'This container implements SURGICAL WRAPPING. It automatically folds text at the boundary to prevent TTY artifacts. It also has a MIN-WIDTH of 30 chars, so it will refuse to collapse into nothingness.',
        );
      },
    );

    // Box 2: Default Truncation + Relative Positioning
    box(
      {
        x: isSmall ? 2 : Math.floor(width * 0.5) + 2,
        y: isSmall ? Math.floor(height * 0.45) + 6 : 4,
        width: isSmall ? width - 4 : Math.floor(width * 0.45),
        border: 'frame',
        borderColor: color.red,
        bgColor: 233,
        title: ' TRUNCATION (DEFAULT) ',
      },
      ({ span, text }) => {
        span({ color: color.bold }, ({ text }) =>
          text(` ${icon('warning')} SIGNAL LOSS\n\n`),
        );
        text(
          'This container uses DEFAULT TRUNCATION. It will cut off the signal at the border, maintaining its rigid vertical height. This is the industrial standard for dense telemetry dashboards.',
        );
      },
    );

    // Footer
    const footer = ` WIDTH: ${color.yellow(width.toString())} | ${isSmall ? color.red('SMALL-VIEW') : color.green('FULL-VIEW')} | ANSI-Aware Reflow `;
    blit(
      Math.floor((width - footer.length) / 2),
      height - 1,
      color.gray(footer),
    );
  },
  { fps: 10 },
);
