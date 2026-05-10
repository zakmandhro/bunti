import { bunti } from '../src/index';
import { ICON_MAP } from '../src/icons';
import pc from 'picocolors';

/**
 * Bunti Nerd Font Stress Test
 * Forces rendering of NF glyphs to verify box alignment math.
 */

const runStressTest = async () => {
  // We explicitly mock the capabilities to force Nerd Font for this demo
  (bunti as any).cachedCaps = { nerdFont: true, unicode: true, glyphProtocol: true, color: true };

  const iconStyle = bunti.createStyle({
    border: 'rounded',
    padding: [1, 2],
    width: 24,
    align: 'center',
    borderColor: pc.cyan
  });

  const rows = [];
  const entries = Object.entries(ICON_MAP);

  for (let i = 0; i < entries.length; i += 3) {
    const chunk = entries.slice(i, i + 3);
    const row = bunti.joinHorizontal(
      ...chunk.map(([name, def]) => {
        // Use the raw NF character from the definition
        return iconStyle(`${def.nf}\n${pc.bold(name)}`);
      })
    );
    rows.push(row);
  }

  const frame = bunti.joinVertical(
    bunti.box(pc.bold(pc.magenta("󰡯  BUNTI :: NERD FONT ALIGNMENT STRESS TEST")), { 
      width: 72, 
      align: 'center', 
      border: 'normal', 
      borderColor: pc.magenta 
    }),
    ...rows,
    bunti.box(pc.dim("FORCED NF MODE :: Verified with Unicode 15.1 math."), { 
      width: 72, 
      align: 'center' 
    })
  );

  console.log(bunti.ANSI.clear + bunti.ANSI.home);
  bunti.render(frame);
  console.log("\n");
};

runStressTest();
