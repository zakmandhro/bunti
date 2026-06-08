import pc from 'picocolors';
import { bunti } from '../src/index';

/**
 * Bunti Namespaced Demo
 */

const runDemo = async () => {
  console.log(bunti.ANSI.clear + bunti.ANSI.hideCursor);

  // 1. Initialize using namespace
  const caps = await bunti.init();

  const panel = bunti.createStyle({
    border: 'rounded',
    borderColor: pc.cyan,
    padding: [1, 2],
    width: 60,
  });

  const iconRow = (name: string, label: string) => {
    return `${bunti.icon(name)} ${pc.bold(name.padEnd(12))} ${pc.dim(label)}`;
  };

  const frame = bunti.joinVertical(
    bunti.box(pc.bold('🥟  BUNTI NAMESPACED ENGINE'), {
      align: 'center',
      width: 60,
      border: 'normal',
      borderColor: pc.magenta,
    }),
    panel(
      pc.blue('TERMINAL CAPABILITIES\n') +
        `NERD FONT: ${caps.nerdFont ? pc.green('DETECTED') : pc.red('NOT FOUND')}\n` +
        `GLYPH PROTOCOL: ${caps.glyphProtocol ? pc.green('SUPPORTED') : pc.yellow('LEGACY')}\n\n` +
        pc.yellow('OPINIONATED ICONS\n') +
        iconRow('satellite', 'Orbital Command') +
        '\n' +
        iconRow('branch', 'Git Worktree') +
        '\n' +
        iconRow('success', 'Mission Landed'),
    ),
    bunti.box(pc.dim("Usage: import { bunti } from 'bunti'"), {
      width: 60,
      align: 'center',
    }),
  );

  bunti.render(frame);
  process.stdout.write(bunti.ANSI.showCursor);
  console.log('\n');
};

runDemo();
