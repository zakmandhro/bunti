import { bunti } from '../src/index';

/**
 * Bunti Responsive Design Demo
 * 
 * Showcases how Bunti elements adapt fluidly to terminal resizing.
 */

bunti.render(({ wallpaper, box, color, width, height, blit, icon, joinHorizontal }) => {
  // 1. Dynamic Background
  wallpaper(234);

  // 2. Anchored Header (Top-Left)
  const header = ` ${icon('satellite')} BUNTI RESPONSIVE CORE `;
  blit(2, 1, color.bgCyan(color.black(header)));

  // 3. Anchored Status (Top-Right)
  const resolution = ` RESOLUTION: ${width}x${height} `;
  blit(width - resolution.length - 2, 1, color.bgMagenta(color.black(resolution)));

  // 4. Center Dashboard (Percentage-based Calculation)
  // We want the box to be 60% of the width and 40% of the height
  const dashW = Math.floor(width * 0.6);
  const dashH = Math.floor(height * 0.4);
  const dashX = Math.floor((width - dashW) / 2);
  const dashY = Math.floor((height - dashH) / 2);

  box({
    x: dashX,
    y: dashY,
    width: dashW,
    height: dashH,
    border: 'frame',
    borderColor: (s) => color.yellow(s),
    bgColor: 233
  }, ({ text, span }) => {
    text(`\n`);
    span({ color: color.bold }, ({ text }) => {
      text(`DYNAMIC VIEWPORT\n\n`);
    });
    
    text(`Width:  ${color.cyan(dashW.toString())} chars (60%)\n`);
    text(`Height: ${color.cyan(dashH.toString())} chars (40%)\n\n`);
    
    text(color.dim(`Resize your terminal window to see the math in action!`));
  });

  // 5. Anchored Footer (Bottom Center)
  const footer = ` ${icon('rocket')} PHASE 2 :: FLUID LAYOUTS ACTIVE `;
  const footerX = Math.floor((width - footer.length) / 2);
  blit(footerX, height - 2, color.gray(footer));

}, { fps: 30, mouse: true });
