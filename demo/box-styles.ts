import { bunti } from '../src/index';

/**
 * Bunti Box Style Showcase
 * Demonstrating Simplified Naming and Side-Specific Border Colors.
 */

bunti.render(({ wallpaper, box, color, width, height, blit }) => {
  // 1. Set a neutral dark backdrop
  wallpaper(233);

  // 2. Title
  const header = ` ${color.bold(color.white('BUNTI TACTICAL GALLERY'))} `;
  const headerX = Math.floor((width - 22) / 2);
  blit(headerX, 1, color.bgBlue(header));

  // 3. Define all styles to showcase
  const wireStyles = ['default', 'rounded', 'double', 'dashed', 'dotted'] as const;
  const industrialStyles = [
    { name: 'FRAME', border: 'frame', bg: 'midnight', label: 'Side Colors' },
    { name: 'THICK-FRAME', border: 'thick-frame', bg: 'ocean', label: 'Ocean' },
    { name: 'FRAME', border: 'frame', bg: 'plasma', label: 'Inset' },
    { name: 'WRAPPING', border: 'frame', bg: 234, label: 'Surgical Wrap', wrap: true, content: 'LONG TEXT THAT SHOULD WRAP SURGICALLY' }
  ] as const;

  const boxW = 24;
  const boxH = 4;
  const gapX = 3;
  const gapY = 2;
  const COLUMNS = 3;
  
  const totalGridW = (boxW * COLUMNS + gapX * (COLUMNS - 1));
  const startX = Math.floor((width - totalGridW) / 2);
  const startY = 4;

  // 4. Render Wireframe Section
  wireStyles.forEach((style, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);

    box({
      x, y,
      width: boxW,
      height: boxH,
      border: style as any,
      borderColor: color.gray
    }, ({ text }) => {
      text(`${style.toUpperCase()}\n(Wireframe)`);
    });
  });

  // 5. Render Industrial Section
  const industrialStartY = startY + Math.ceil(wireStyles.length / COLUMNS) * (boxH + gapY);

  industrialStyles.forEach((cfg, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = startX + col * (boxW + gapX);
    const y = industrialStartY + row * (boxH + gapY);

    const borderColor = cfg.label === 'Side Colors' ? {
      top: color.lighten(cfg.bg, 30),
      bottom: color.darken(cfg.bg, 30),
      left: color.lighten(cfg.bg, 15),
      right: color.darken(cfg.bg, 15)
    } : cfg.label === 'Inset' ? color.darken(cfg.bg, 30) : color.lighten(cfg.bg, 40);

    box({
      x, y,
      width: boxW,
      height: cfg.wrap ? boxH + 2 : boxH,
      border: cfg.border as any,
      borderColor: borderColor,
      bgColor: cfg.bg,
      wrap: cfg.wrap
    }, ({ text }) => {
      text(cfg.content || `${cfg.name}\n(${cfg.label})`);
    });
  });

  // Footer
  const footer = " Bunti Simplified Standard: Default | Rounded | Double | Dashed | Dotted | Frame | Thick-Frame ";
  const footerX = Math.floor((width - footer.length) / 2);
  blit(footerX, height - 1, color.gray(footer));

}, { fps: 10, mouse: true });
