import { demo } from "./demo-layout";

/**
 * Bunti Layout Showcase
 * THE DEFINITIVE VERIFICATION SUITE
 */

demo("LAYOUT ARCHITECTURE", (ctx, bounds) => {
  const { box, color, gradient, icon } = ctx;
  const W = Math.min(bounds.w - 8, 100);
  const X = bounds.centerW(W);

  // Left Panel: Constraints & Sizing (Fixed Width)
  box({
    x: X,
    y: bounds.y,
    width: Math.floor(W * 0.4),
    height: Math.floor(bounds.h * 0.6),
    border: 'rounded',
    borderColor: 'cyan',
    padding: [1, 2]
  }, ({ text, box: subBox }) => {
    text(color.cyan(color.bold("CONSTRAINTS\n\n")));
    
    // Fixed Sizing
    subBox({ width: 28, border: 'default', padding: [0, 1] }, ({ text }) => {
      text("Fixed Width: 28 cols");
    });
    text("\n");

    // Percentage Sizing
    subBox({ width: '100%', border: 'default', padding: [0, 1] }, ({ text }) => {
      text("Percent Width: 100%");
    });
    text("\n");

    // Relative Contrast (Automatic Depth)
    subBox({ 
      width: '100%', 
      bgColor: 'ocean', 
      border: 'thick-frame', 
      borderColor: color.lighten('ocean', 30),
      padding: [0, 1] 
    }, ({ text }) => {
      text(color.bold("Industrial Frame"));
    });
  });

  // Right Panel: Alignment & Flow
  box({
    x: X + Math.floor(W * 0.4) + 2,
    y: bounds.y,
    width: Math.floor(W * 0.6) - 2,
    height: Math.floor(bounds.h * 0.6),
    border: 'double',
    borderColor: 'magenta',
    padding: [1, 2]
  }, ({ text, box: subBox }) => {
    text(color.magenta(color.bold("MULTI-AXIS ALIGNMENT\n\n")));

    subBox({ width: '100%', height: 4, align: 'left', valign: 'top', border: 'dashed', borderColor: 'gray' }, ({ text }) => {
      text(" [ Top Left ]");
    });
    text("\n");

    subBox({ width: '100%', height: 6, align: 'center', valign: 'middle', border: 'dashed', borderColor: 'gray' }, ({ text }) => {
      text("[ Middle Center ]\n(3-Row Block)\nSignal Nominal");
    });
    text("\n");

    subBox({ width: '100%', height: 4, align: 'right', valign: 'bottom', border: 'dashed', borderColor: 'gray' }, ({ text }) => {
      text("[ Bottom Right ] ");
    });
  });

  // Bottom Center Piece: The "Reactor" (Gradient & Depth)
  const reactorGrad = gradient({ 
    colors: ['midnight', 'bunti-blue', 'ocean'], 
    direction: 'vertical' 
  });

  box({
    x: bounds.centerW(20),
    y: bounds.y + Math.floor(bounds.h * 0.6) + 1,
    width: 20,
    height: 6,
    bgColor: reactorGrad,
    border: 'thick-frame',
    borderColor: 'white',
    align: 'center',
    valign: 'middle',
    padding: [0, 0]
  }, ({ text }) => {
    text(color.bold("CORE\nNOMINAL"));
  });
});
