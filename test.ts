import { box, joinHorizontal, joinVertical, render } from './src/index';
import pc from 'picocolors';

const leftPane = box(pc.blue('Active PRs\n') + '✓ #123 Fix Layout\n⚠ #124 Update bunti', { 
  width: 30, 
  border: 'rounded', 
  padding: [1, 2],
  borderColor: pc.blue
});

const rightPane = box(pc.magenta('Agents\n') + '● Claude\n○ Codex', { 
  width: 30, 
  border: 'rounded', 
  padding: [1, 2],
  borderColor: pc.magenta
});

const header = box(pc.green('🚀 SPACE STATION MISSION CONTROL'), {
  align: 'center',
  padding: [0, 0],
});

const dashboard = joinVertical(
  header,
  joinHorizontal(leftPane, rightPane)
);

render(dashboard);
