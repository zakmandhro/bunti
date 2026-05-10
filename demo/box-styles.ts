import { bunti } from '../src/index';

/**
 * Bunti Box Style Showcase
 * Demonstrating the new Tactical Naming Convention.
 */

bunti.render(({ wallpaper, box, color, width, height, blit }) => {
  // 1. Set a neutral dark backdrop
  wallpaper(233);

  // 2. Title
  const header = ` ${color.bold(color.white('BUNTI TACTICAL GALLERY'))} `;
  const headerX = Math.floor((width - 22) / 2);
  blit(headerX, 1, color.bgBlue(header));

  // 3. Main Tactical Grid
  const tacticalStyles = [
    'small', 'rounded', 'medium',
    'double', 'dashed', 'dotted',
    'large', 'extra-large'
  ] as const;

  const boxW = 22;
  const boxH = 4;
  const gapX = 3;
  const gapY = 1;
  
  // Center the grid
  const totalGridW = (boxW * 3 + gapX * 2);
  const startX = Math.floor((width - totalGridW) / 2);
  const startY = 3;

  tacticalStyles.forEach((style, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);

    box({
      x, y,
      width: boxW,
      height: boxH,
      border: style,
      borderColor: (s) => color.cyan(s),
      bgColor: 234
    }, ({ text }) => {
      text(`${style.toUpperCase()}`);
    });
  });

  // Footer
  const footer = " Bunti Tactical Standard | Press Ctrl+C to exit ";
  const footerX = Math.floor((width - footer.length) / 2);
  blit(footerX, height - 1, color.gray(footer));

}, { fps: 10, mouse: true });
