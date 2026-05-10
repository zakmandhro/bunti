import { bunti } from '../src/index';
import { ICON_MAP } from '../src/icons';
import pc from 'picocolors';

/**
 * Bunti Triple-Variant Icon Manifest
 * Shows [ NF  EMOJI  ASCII ] in one box per icon.
 */

const runShowcase = async () => {
  await bunti.init();

  const allIconNames = Object.keys(ICON_MAP);
  const rows = [];
  const COLUMNS = 3;
  const ENTRY_WIDTH = 36;

  for (let i = 0; i < allIconNames.length; i += COLUMNS) {
    const chunk = allIconNames.slice(i, i + COLUMNS);
    const row = bunti.joinHorizontal(
      ...chunk.map(name => {
        const def = ICON_MAP[name]!;
        // Triple Variant string: NF (1) + 2 spaces + Emoji (2) + 2 spaces + ASCII (1)
        const variants = `${pc.blue(def.nf)}  ${pc.yellow(def.emoji)}  ${pc.gray(def.ascii)}`;
        const iconBox = bunti.box(variants, { 
          border: 'normal', 
          padding: [0, 1],
          borderColor: pc.cyan 
        });
        const label = '\n ' + pc.bold(name);
        return bunti.box(bunti.joinHorizontal(iconBox, label), { width: ENTRY_WIDTH });
      })
    );
    rows.push(row);
  }

  const totalWidth = COLUMNS * ENTRY_WIDTH;
  const frame = bunti.joinVertical(
    bunti.box(pc.bold(pc.magenta(`${bunti.icon('bunti')}  BUNTI :: THE TRIPLE-VARIANT MANIFEST`)), { 
      width: totalWidth, 
      align: 'center', 
      border: 'normal', 
      borderColor: pc.magenta 
    }),
    '',
    ...rows,
    '',
    bunti.box(pc.dim(`Total Icons: ${allIconNames.length} | Format: [ NF  EMOJI  ASCII ] name`), { 
      width: totalWidth, 
      align: 'center' 
    })
  );

  console.log(bunti.ANSI.clear + bunti.ANSI.home);
  bunti.render(frame);
  console.log("\n");
};

runShowcase();
