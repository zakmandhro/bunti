import { demo } from './demo-layout';

/**
 * Bunti Color & Gradient Showcase
 */

demo('COLOR & GRADIENT REGISTRY', (ctx, bounds) => {
  const { box, color, gradient } = ctx;
  const W = Math.min(bounds.w - 8, 100);
  const X = bounds.centerW(W);

  // Semantic Palette & Math
  box(
    {
      x: X,
      y: bounds.y,
      width: Math.floor(W * 0.4),
      height: bounds.h,
      border: 'rounded',
      borderColor: 'cyan',
      padding: [1, 2],
    },
    ({ text, span }) => {
      text(color.cyan(color.bold('TACTICAL PALETTE\n\n')));

      const sampleColors = [
        'bunti-blue',
        'ocean',
        'nebula',
        'plasma',
        'gold',
        'rose',
        'success',
        'warning',
        'error',
      ];

      sampleColors.forEach((name) => {
        text(`${name.padEnd(12)} `);
        span({ color: name }, ({ text }) => text('██████'));
        text('\n');
      });

      text(color.cyan(color.bold('\nCOLOR MATH\n\n')));
      text('Darken 40%:  ');
      span({ color: color.darken('bunti-blue', 40) }, ({ text }) =>
        text('██████\n'),
      );
      text('Original:    ');
      span({ color: 'bunti-blue' }, ({ text }) => text('██████\n'));
      text('Lighten 40%: ');
      span({ color: color.lighten('bunti-blue', 40) }, ({ text }) =>
        text('██████\n'),
      );
    },
  );

  // Gradient Factory
  box(
    {
      x: X + Math.floor(W * 0.4) + 2,
      y: bounds.y,
      width: Math.floor(W * 0.6) - 2,
      height: bounds.h,
      border: 'double',
      borderColor: 'magenta',
      padding: [1, 2],
    },
    ({ text, box: subBox }) => {
      text(color.magenta(color.bold('GRADIENT INTERPOLATION\n\n')));

      const gradW = Math.floor(W * 0.6) - 8;

      // Spectrum
      text('Horizontal Spectrum:\n');
      const spec = gradient({
        colors: ['red', 'gold', 'mint', 'sky', 'plasma'],
        direction: 'horizontal',
        steps: gradW,
      });
      subBox(
        { width: gradW, height: 2, bgColor: spec, border: 'none' },
        () => {},
      );
      text('\n\n');

      // Deep Space
      text('Deep Space (Nebula/Plasma):\n');
      const space = gradient({
        colors: ['midnight', 'nebula', 'plasma'],
        direction: 'horizontal',
        steps: gradW,
      });
      subBox(
        { width: gradW, height: 2, bgColor: space, border: 'none' },
        () => {},
      );
      text('\n\n');

      // Vertical Test
      text('Vertical Transition:\n');
      const vert = gradient({
        colors: ['gold', 'rose'],
        direction: 'vertical',
        steps: 4,
      });
      subBox({ width: 12, height: 4, bgColor: vert, border: 'none' }, () => {});
    },
  );
});
