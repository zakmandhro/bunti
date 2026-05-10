import { render, KEYS, bunti as b } from '../src/index';

const PLANETS = [
  { name: 'Earth', branch: 'main', status: 'Ready' },
  { name: 'Mars', branch: 'feat/rover', status: 'Active(2)' },
  { name: 'Venus', branch: 'fix/acid-rain', status: 'In Use' },
  { name: 'Jupiter', branch: 'chore/gas', status: 'Ready' },
];

const ISSUES = [
  { number: 42, title: 'Atmosphere leaking on Mars', labels: ['bug', 'critical'] },
  { number: 101, title: 'Venus rotation too slow', labels: ['feature'] },
  { number: 202, title: 'Earth needs more trees', labels: ['improvement'] },
];

function Panel(ctx: any, id: string, title: string, items: string[]) {
  ctx.box({ id, title, border: 'tactical', padding: [0, 2], align: 'left', size: 80 }, (sub: any) => {
    sub.list(id, items, {
      focusStyle: (s: string) => sub.color.bold(sub.color.cyan(`> ${s.trim()}`))
    });
  });
}

render((ctx) => {
  ctx.wallpaper('#0a0a0b');

  // Header
  ctx.box({ border: 'none', padding: [1, 2], size: 'auto' }, (sub) => {
    sub.span({ color: sub.color.cyan }, (s) => s.text(' MISSION CONTROL '));
    sub.span({ color: sub.color.gray }, (s) => s.text(` v2.0 • ${new Date().toLocaleTimeString()}`));
  });

  ctx.text('\n');

  // Planets
  const planetLines = PLANETS.map(p => 
    `${ctx.color.green('✔')} ${p.name.padEnd(10)} ${ctx.color.gray(p.branch.padEnd(15))} ${p.status}`
  );
  Panel(ctx, 'planets', ' PLANETS ', planetLines);

  ctx.text('\n');

  // Issues
  const issueLines = ISSUES.map(i => 
    `${ctx.color.magenta('#' + i.number)} ${i.title} ${ctx.color.gray('[' + i.labels.join(',') + ']')}`
  );
  Panel(ctx, 'issues', ' ISSUES ', issueLines);

  ctx.text('\n');
  ctx.span({ color: ctx.color.gray }, (s) => s.text('  Press TAB to switch, UP/DOWN to navigate, q to quit'));

  if (ctx.lastKey === 'q') process.exit(0);
}, { fps: 60 });
