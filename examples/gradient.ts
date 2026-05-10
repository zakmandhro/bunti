import { bunti } from '../src/index';

/**
 * Bunti Gradient Utility Demo
 * 
 * Showcases the `gradient(color1, color2, steps)` helper 
 * and how it can be used for smooth UI transitions.
 */

bunti.render(({ wallpaper, gradient, rgb, box, color }) => {
  // 1. Define two RGB points
  const deepSpace = rgb(10, 10, 30);
  const supernova = rgb(200, 50, 50);

  // 2. Generate a 15-step color ramp
  const config = gradient({ colors: [deepSpace, supernova], steps: 15 });
  const ramp = config.colors;

  // 3. Apply to wallpaper
  wallpaper(config);

  // 4. Show the ramp steps in a box
  box({
    size: "auto",
    bgColor: "white",
  }, ({ text, span }) => {
    span({ color: color.black }, ({ text }) => {
      text(" 🌈  GRADIENT RAMP  \n\n ");
    });

    // Draw blocks for each color in the ramp
    ramp.forEach((c: any) => {
      // Now span() correctly handles our RGB objects!
      span({ color: c }, ({ text }) => {
        text("█");
      });
    });
    
    text("\n ");
    
    // Reverse it for fun
    ramp.slice().reverse().forEach((c: any) => {
      span({ color: c }, ({ text }) => {
        text("█");
      });
    });
  });
});
