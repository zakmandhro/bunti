import { bunti } from '../src/index';
import pc from 'picocolors';

/**
 * Bunti Static Dashboard Showcase
 * A clean, high-fidelity grid for visual validation.
 */

const run = async () => {
  await bunti.init();

  const panel = bunti.createStyle({
    border: 'rounded',
    borderColor: pc.cyan,
    padding: [1, 2],
    width: 40
  });

  const header = bunti.createStyle({
    align: 'center',
    border: 'normal',
    borderColor: pc.magenta,
    padding: [0, 1],
    width: 82
  });

  const content = bunti.joinVertical(
    header(pc.bold("🛰️  MISSION CONTROL :: ORBITAL STATUS")),
    bunti.joinHorizontal(
      panel(pc.blue("CORE TELEMETRY\n") + "STATUS: NOMINAL\nUPTIME: 14D 2H\nLOAD: 0.12%"),
      panel(pc.magenta("PLANET STATUS\n") + "MERCURY: ACTIVE\nVENUS:   IDLE\nEARTH:   STABLE")
    ),
    bunti.box(pc.dim("Bunti Layout Engine :: Pure TypeScript :: Bun-Native"), { width: 82, align: 'center' })
  );

  console.log(bunti.ANSI.clear + bunti.ANSI.home);
  bunti.render(content);
  console.log("\n");
};

run();
