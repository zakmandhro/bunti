import pc from 'picocolors';
import {
  ANSI,
  box,
  createStyle,
  icon,
  init,
  joinVertical,
  render,
} from '../src/index';

/**
 * Bunti Icon & Capability Demo
 */

const runDemo = async () => {
  console.log(ANSI.clear + ANSI.hideCursor);

  // 1. Initialize Bunti (Detect capabilities)
  const caps = await init();

  const panel = createStyle({
    border: 'rounded',
    borderColor: pc.cyan,
    padding: [1, 2],
    width: 60,
  });

  const iconRow = (name: string, label: string) => {
    return `${icon(name)} ${pc.bold(name.padEnd(12))} ${pc.dim(label)}`;
  };

  const frame = joinVertical(
    box(pc.bold('🛰️  BUNTI ICON ENGINE & CAPABILITY DETECTION'), {
      align: 'center',
      width: 60,
      border: 'normal',
      borderColor: pc.magenta,
    }),
    panel(
      pc.blue('TERMINAL CAPABILITIES\n') +
        `NERD FONT: ${caps.nerdFont ? pc.green('DETECTED') : pc.red('NOT FOUND')}\n` +
        `GLYPH PROTOCOL: ${caps.glyphProtocol ? pc.green('SUPPORTED') : pc.yellow('LEGACY')}\n\n` +
        pc.yellow('ICON GALLERY\n') +
        iconRow('satellite', 'Orbital Command') +
        '\n' +
        iconRow('branch', 'Git Worktree') +
        '\n' +
        iconRow('success', 'Mission Landed') +
        '\n' +
        iconRow('loading', 'Propulsion Warm-up') +
        '\n' +
        iconRow('agent', 'AI Pilot Active'),
    ),
    box(
      pc.dim('Bunti automatically falls back to Emojis or ASCII if needed.'),
      { width: 60, align: 'center' },
    ),
  );

  render(frame);
  process.stdout.write(ANSI.showCursor);
  console.log('\n');
};

runDemo();
