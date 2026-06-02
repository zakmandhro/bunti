import { ICON_MAP } from '../src/index';
import { demo } from './demo-layout';

/**
 * Bunti Visual Gallery
 */

demo('VISUAL REGISTRY', (ctx, bounds) => {
  const { box, color, gradient } = ctx;

  const MASTER_WIDTH = 84;
  const START_X = bounds.centerW(MASTER_WIDTH);

  // 1. Color Spectrum (Locked to Master Grid)
  const specGrad = gradient({
    colors: ['midnight', 'ocean', 'sky', 'nebula', 'plasma', 'rose', 'gold'],
    direction: 'horizontal',
    steps: MASTER_WIDTH,
  });

  box(
    {
      x: START_X,
      y: bounds.y,
      width: MASTER_WIDTH,
      height: 1,
      bgColor: specGrad,
      border: 'none',
      padding: [0, 0],
    },
    () => {},
  );

  // 2. Style Showcase (Rigid Row, 3 boxes)
  const W = 88;
  const X = bounds.centerW(W);
  const boxW = 28;
  const gapX = 2;
  const rowH = 7;
  const currentY = bounds.y + 2;

  const wireStyles = ['default', 'rounded', 'double'] as const;
  const industrialStyles = [
    { name: 'FRAME', border: 'frame', bg: 'midnight', label: 'Side Colors' },
    { name: 'THICK-FRAME', border: 'thick-frame', bg: 'ocean', label: 'Ocean' },
    {
      name: 'WRAPPING',
      border: 'frame',
      bg: 234,
      label: 'Surgical',
      wrap: true,
      content: 'LONG TEXT THAT WRAPS SURGICALLY',
    },
  ];

  // Showcase Row 1 (Wireframe)
  wireStyles.forEach((style, i) => {
    box(
      {
        x: X + i * (boxW + gapX),
        y: currentY,
        width: boxW,
        height: rowH,
        border: style as any,
        borderColor: 'gray',
        align: 'center',
        valign: 'middle',
      },
      ({ text }) => {
        text(`${style.toUpperCase()}\n(Wireframe)`);
      },
    );
  });

  const row2Y = currentY + rowH + 1;

  // Showcase Row 2 (Industrial)
  industrialStyles.forEach((cfg, i) => {
    const borderColor =
      cfg.label === 'Side Colors'
        ? {
            top: color.lighten(cfg.bg, 30),
            bottom: color.darken(cfg.bg, 30),
            left: color.lighten(cfg.bg, 15),
            right: color.darken(cfg.bg, 15),
          }
        : color.lighten(cfg.bg, 40);

    box(
      {
        x: X + i * (boxW + gapX),
        y: row2Y,
        width: boxW,
        height: rowH,
        border: cfg.border as any,
        borderColor: borderColor,
        bgColor: cfg.bg,
        align: 'center',
        valign: 'middle',
        wrap: cfg.wrap,
        padding: [1, 2],
      },
      ({ text }) => {
        text(cfg.content || `${cfg.name}\n(${cfg.label})`);
      },
    );
  });

  // 3. Icon Manifest (Rigid Grid - THE REFINERY)
  const allIconNames = Object.keys(ICON_MAP);
  const ICON_COLS = 4;
  const rowsCount = Math.ceil(allIconNames.length / ICON_COLS);
  const _colW = Math.floor(W / ICON_COLS);

  const tableData: string[][] = [];
  for (let r = 0; r < rowsCount; r++) {
    const row: string[] = [];
    for (let c = 0; c < ICON_COLS; c++) {
      const idx = r * ICON_COLS + c;
      const name = allIconNames[idx];
      if (name) {
        const glyph = ctx.icon(name);
        row.push(`${glyph}   ${color.dim(name)}`); // Simplest for table layout
      } else {
        row.push(' ');
      }
    }
    tableData.push(row);
  }

  const tableY = row2Y + rowH + 2;

  box(
    { x: X, y: tableY, width: W, border: 'none', padding: [0, 0] },
    ({ table }) => {
      table(tableData, {
        width: W,
        padding: [0, 0],
        border: 'none',
        columns: [
          { align: 'left' },
          { align: 'left' },
          { align: 'left' },
          { align: 'left' },
        ],
      });
    },
  );
});
