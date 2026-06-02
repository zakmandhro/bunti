import { bunti } from '../src/index';

/**
 * Bunti High-Fidelity Spec Demo
 *
 * Spec:
 * - White Box, Black Text, H-Centered
 * - Rocket Icon (󰢵)
 * - "Hello from Bunti"
 * - "Blazing fast native TUI for Bun"
 */

bunti.render(
  ({ wallpaper, box, color, icon, gradient }) => {
    // 1. Dynamic Blue-to-Red Gradient Background
    wallpaper(gradient({ colors: ['#0000ff', '#ff0000'], steps: 20 }));

    // 2. High-Contrast Centered Box
    box(
      {
        bgColor: 'white',
        color: 'blank',
      },
      ({ span, text }) => {
        // Top Icon (Rocket Launch 󰢵)
        text('\n');
        text(`  󰢵  \n\n`);

        // Main Greeting
        span({ color: color.bold }, ({ text }) => {
          text('Hello from ');
          text(
            color.bold(color.cyan('B')) +
              color.bold(color.magenta('u')) +
              color.bold(color.yellow('n')) +
              color.bold(color.green('t')) +
              color.bold(color.blue('i')) +
              '\n',
          );
        });

        // Subtitle with Bun Icon ()
        text(`Blazing fast native TUI for  Bun\n `);
      },
    );
  },
  { once: true },
);
