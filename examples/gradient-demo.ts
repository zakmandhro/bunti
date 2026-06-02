import { bunti } from '../src/index';

/**
 * Bunti Fluent Gradient & Wallpaper Demo
 *
 * Showcases the nested `b.wallpaper(b.gradient(...))` syntax.
 */

bunti.render((b) => {
  // 1. Nested fluent API for wallpapers
  // This automatically interpolates between black and blue over 10 horizontal steps.
  b.wallpaper(
    b.gradient({
      colors: ['black', 'blue'],
      direction: 'horizontal',
      steps: 10,
    }),
  );

  // 2. High-fidelity UI box on top
  b.box(
    {
      size: 'auto',
      bgColor: 'white',
      color: 'blank',
    },
    ({ span, text }) => {
      span({ color: b.color.bold }, ({ text }) => {
        text(' 🌈  FLUENT GRADIENT API  ');
      });

      text('\n\n');

      text('b.wallpaper(b.gradient({\n');
      text("  colors: ['black', 'blue'],\n");
      text("  direction: 'horizontal'\n");
      text('}))');
    },
  );
});
