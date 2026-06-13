import { bunti, splitRect, visibleWidth } from '../src/index';

/**
 * Bunti Responsive Standard
 * Consolidating Fluid Grid Shifting, Min-Width constraints, and Surgical Wrapping.
 */

bunti.render(
  ({ wallpaper, box, color, width, height, blit, icon, resolveLocalRect }) => {
    wallpaper(233);

    // 1. Header
    const header = ` ${color.bold(color.white('BUNTI :: RESPONSIVE FLUIDITY'))} `;
    const headerArea = resolveLocalRect({
      y: 1,
      width: visibleWidth(header),
      height: 1,
    });
    blit(headerArea.x, headerArea.y, color.bgGreen(header));

    const isSmall = width < 70;
    const body = resolveLocalRect(
      {
        x: 2,
        y: 4,
        width: width - 4,
        height: height - 6,
      },
      { defaultX: 'left', defaultY: 'top' },
    );
    const [wrapPanel, truncPanel] = splitRect(body, {
      direction: isSmall ? 'vertical' : 'horizontal',
      constraints: ['1fr', '1fr'],
      gap: 2,
    });

    // Box 1: Surgical Wrapping + Min-Width
    box(
      {
        x: wrapPanel?.x,
        y: wrapPanel?.y,
        width: wrapPanel?.width,
        height: wrapPanel?.height,
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
        x: truncPanel?.x,
        y: truncPanel?.y,
        width: truncPanel?.width,
        height: truncPanel?.height,
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
    const footerArea = resolveLocalRect({
      y: height - 1,
      width: visibleWidth(footer),
      height: 1,
    });
    blit(footerArea.x, footerArea.y, color.gray(footer));
  },
  { fps: 10 },
);
