import { bunti, innerRect, splitRect } from '../src/index';

/**
 * Bunti Mission Control Dashboard
 * Demonstrating Component Composition, Focus Management, and High-Density Layouts.
 */

const PLANETS = [
  { name: 'Earth', branch: 'main', status: 'Ready' },
  { name: 'Mars', branch: 'feat/rover', status: 'Active(2)' },
  { name: 'Venus', branch: 'fix/acid-rain', status: 'In Use' },
  { name: 'Jupiter', branch: 'chore/gas', status: 'Ready' },
];

const ISSUES = [
  {
    number: 42,
    title: 'Atmosphere leaking on Mars',
    labels: ['bug', 'critical'],
  },
  { number: 101, title: 'Venus rotation too slow', labels: ['feature'] },
  { number: 202, title: 'Earth needs more trees', labels: ['improvement'] },
];

bunti.render(
  ({
    wallpaper,
    box,
    color,
    width,
    height,
    blit,
    lastKey,
    resolveLocalRect,
    requestStop,
    focusable,
  }) => {
    wallpaper('#0a0a0b');

    // 1. Header
    box({ border: 'none', padding: [1, 2], x: 2, y: 1 }, ({ span, text }) => {
      span({ color: color.cyan }, (s) => s.text(' MISSION CONTROL '));
      span({ color: color.gray }, (s) =>
        s.text(` v1.0 • ${new Date().toLocaleTimeString()}`),
      );
    });

    // 2. Main Layout Grid
    const screen = { x: 0, y: 0, width, height: 24 };
    const mainBounds = innerRect(screen, { left: 2, right: 2 });
    const main = resolveLocalRect(
      { x: mainBounds.x, y: 5, width: mainBounds.width, height: 10 },
      { defaultX: 'left', defaultY: 'top' },
    );
    const [fleet, telemetry] = splitRect(main, {
      direction: 'horizontal',
      constraints: ['1fr', '1fr'],
      gap: 2,
    });
    const fleetFocused = focusable('planets');
    const telemetryFocused = focusable('issues');
    const quietBorder = { r: 150, g: 150, b: 150 };
    const focusedBorder = { r: 90, g: 200, b: 230 };
    const muted = { r: 135, g: 135, b: 135 };
    const issueLabel = { r: 120, g: 120, b: 120 };

    // Planets Panel
    box(
      {
        id: 'planets',
        x: fleet?.x,
        y: fleet?.y,
        width: fleet?.width,
        height: fleet?.height,
        border: 'default',
        title: ' PLANETARY FLEET ',
        borderColor: fleetFocused ? focusedBorder : quietBorder,
        titleStyle: fleetFocused ? color.cyan : color.gray,
      },
      (sub) => {
        const planetLines = PLANETS.map(
          (p) =>
            `${color.green('✔')} ${p.name.padEnd(10)} ${color.fg(muted, p.branch.padEnd(15))} ${p.status}`,
        );
        sub.list('planets', planetLines, {
          width: '100%', // selectedBg defaults to theme.selection
        });
      },
    );

    // Issues Panel
    box(
      {
        id: 'issues',
        x: telemetry?.x,
        y: telemetry?.y,
        width: telemetry?.width,
        height: telemetry?.height,
        border: 'default',
        title: ' CRITICAL TELEMETRY ',
        borderColor: telemetryFocused ? focusedBorder : quietBorder,
        titleStyle: telemetryFocused ? color.cyan : color.gray,
      },
      (sub) => {
        const issueLines = ISSUES.map((i) => {
          const number = color.magenta(`#${i.number.toString().padStart(3)}`);
          const title = i.title.padEnd(36);
          const labels = color.fg(issueLabel, `[${i.labels.join(',')}]`);
          return `${number}  ${title} ${labels}`;
        });
        sub.list('issues', issueLines, {
          width: '100%', // selectedBg defaults to theme.selection
        });
      },
    );

    // 3. Status Bar
    const statusX = 4;
    const statusY = 17;
    blit(statusX, statusY, color.gray('  Press '));
    blit(statusX + 8, statusY, color.white('TAB'));
    blit(statusX + 12, statusY, color.gray(' to switch focus, '));
    blit(statusX + 30, statusY, color.white('UP/DOWN'));
    blit(statusX + 38, statusY, color.gray(' to navigate, '));
    blit(statusX + 52, statusY, color.white('q'));
    blit(statusX + 54, statusY, color.gray(' to abort mission.'));

    if (lastKey === 'q') requestStop();
  },
  {
    fps: 60,
    keyboard: true,
    hideCursor: true,
    alternateBuffer: true,
  },
);
