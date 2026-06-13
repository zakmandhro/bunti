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

    // Planets Panel
    box(
      {
        id: 'planets',
        x: fleet?.x,
        y: fleet?.y,
        width: fleet?.width,
        height: fleet?.height,
        border: 'frame',
        title: ' PLANETARY FLEET ',
      },
      (sub) => {
        const planetLines = PLANETS.map(
          (p) =>
            `${color.green('✔')} ${p.name.padEnd(10)} ${color.gray(p.branch.padEnd(15))} ${p.status}`,
        );
        sub.list('planets', planetLines, {
          focusStyle: (s) => color.bold(color.cyan(`> ${s.trim()}`)),
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
        border: 'frame',
        title: ' CRITICAL TELEMETRY ',
      },
      (sub) => {
        const issueLines = ISSUES.map(
          (i) =>
            `${color.magenta(`#${i.number}`)} ${i.title} ${color.gray(`[${i.labels.join(',')}]`)}`,
        );
        sub.list('issues', issueLines, {
          focusStyle: (s) => color.bold(color.magenta(`! ${s.trim()}`)),
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

    if (lastKey === 'q') process.exit(0);
  },
  { fps: 60 },
);
