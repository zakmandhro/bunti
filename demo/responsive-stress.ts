import { bunti } from '../src/index';

/**
 * Bunti Responsive Stress Test
 * 
 * Verifies:
 * 1. minWidth persistence.
 * 2. Automatic horizontal/vertical layout shifts.
 * 3. Text wrapping vs Truncation.
 */

bunti.render(({ wallpaper, box, color, width, height, blit, icon }) => {
  // 1. Dark Backdrop
  wallpaper(234);

  // 2. Dynamic Status Bar
  const status = ` RESPONSIVE STRESS TEST | RES: ${width}x${height} `;
  blit(2, 1, color.bgCyan(color.black(status)));

  // 3. Horizontal Grid (Vertical if small)
  const isSmall = width < 80;
  
  // Box 1: Wrapped with minWidth
  box({
    x: isSmall ? 2 : 2,
    y: 4,
    width: isSmall ? width - 4 : Math.floor(width * 0.45),
    minWidth: 30,
    wrap: true,
    border: 'frame',
    borderColor: (s) => color.green(s),
    bgColor: 233,
  }, ({ span, text }) => {
    span({ color: color.bold }, ({ text }) => text("WRAPPING + MIN-WIDTH\n\n"));
    text("This box will WRAP its text once it hits the boundary. It also has a MIN-WIDTH of 30, so it will stop shrinking even if the window gets smaller.");
  });

  // Box 2: Truncated
  box({
    x: isSmall ? 2 : Math.floor(width * 0.5) + 2,
    y: isSmall ? Math.floor(height * 0.45) + 4 : 4,
    width: isSmall ? width - 4 : Math.floor(width * 0.45),
    border: 'frame',
    borderColor: (s) => color.red(s),
    bgColor: 233,
  }, ({ span, text }) => {
    span({ color: color.bold }, ({ text }) => text("TRUNCATION (DEFAULT)\n\n"));
    text("This box will TRUNCATE its text at the border. It will not grow vertically. It just cuts off the signal.");
  });

  // Footer Instructions
  const footer = " Resize Terminal to Test: [ MinWidth | Wrap | Shifting ] ";
  blit(Math.floor((width - footer.length) / 2), height - 2, color.gray(footer));

}, { fps: 60, mouse: true });
