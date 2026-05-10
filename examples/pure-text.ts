import { bunti } from '../src/index';

/**
 * Bunti Pure Text Baseline
 * 
 * Verifying:
 * 1. Correct h-centering of pure text
 * 2. Proper border alignment with only 1-width characters
 * 3. Wallpaper isolation
 */

const SKY_GRADIENT = [17, 18, 19, 20, 52, 53, 88, 89, 124, 125];

bunti.render(({ wallpaper, box, color }) => {
  wallpaper({ color: SKY_GRADIENT });

  box({
    size: "auto",
    bgColor: "white",
    color: "blank",
  }, ({ span, text }) => {
    text("\n");
    
    span({ color: color.bold }, ({ text }) => {
      text("LINE ONE: HELLO\n");
    });

    text("LINE TWO: FROM BUNTI\n");

    span({ color: color.dim }, ({ text }) => {
      text("LINE THREE: NATIVE ENGINE");
    });
    
    text("\n ");
  });
}, { once: true });
