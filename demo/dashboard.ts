import { render, box as layoutBox, joinHorizontal, joinVertical } from '../src/index';

/**
 * Bunti Static Dashboard Showcase
 * A clean, high-fidelity grid for visual validation.
 */

render(({ box, color }) => {
  box({ border: 'none', size: 82 }, ({ text }) => {
    const header = layoutBox(color.bold("🛰️  MISSION CONTROL :: ORBITAL STATUS"), {
      align: 'center',
      border: 'rounded',
      borderColor: color.magenta,
      padding: [0, 1],
      width: 82
    });

    const panel1 = layoutBox(color.blue("CORE TELEMETRY\n") + "STATUS: NOMINAL\nUPTIME: 14D 2H\nLOAD: 0.12%", {
      border: 'rounded',
      borderColor: color.cyan,
      padding: [1, 2],
      width: 40
    });

    const panel2 = layoutBox(color.magenta("PLANET STATUS\n") + "MERCURY: ACTIVE\nVENUS:   IDLE\nEARTH:   STABLE", {
      border: 'rounded',
      borderColor: color.cyan,
      padding: [1, 2],
      width: 40
    });

    const footer = layoutBox(color.dim("Bunti Layout Engine :: Pure TypeScript :: Bun-Native"), { 
      width: 82, 
      align: 'center' 
    });

    text(joinVertical(
      header,
      joinHorizontal(panel1, panel2),
      footer
    ));
  });
}, { once: true });
