import { ICON_MAP, splitRect } from '../src/index';
import { demo } from './demo-layout';

/**
 * Bunti Visual Gallery
 */

demo('VISUAL REGISTRY', (ctx, bounds) => {
  const { box, color, gradient } = ctx;

  const MASTER_WIDTH = 84;
  const spectrum = bounds.place({
    width: MASTER_WIDTH,
    height: 1,
  });

  // 1. Color Spectrum (Locked to Master Grid)
  const specGrad = gradient({
    colors: ['midnight', 'ocean', 'sky', 'nebula', 'plasma', 'rose', 'gold'],
    direction: 'horizontal',
    steps: MASTER_WIDTH,
  });

  box(
    {
      x: spectrum.x,
      y: spectrum.y,
      width: spectrum.width,
      height: spectrum.height,
      bgColor: specGrad,
      border: 'none',
      padding: [0, 0],
    },
    () => {},
  );

  // 2. Style Showcase (Rigid Row, 3 boxes)
  const W = 88;
  const rowH = 7;
  const row1 = bounds.place({
    y: 2,
    width: W,
    height: rowH,
  });
  const row1Cells = splitRect(row1, {
    direction: 'horizontal',
    constraints: ['1fr', '1fr', '1fr'],
    gap: 2,
  });

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
    const cell = row1Cells[i];
    box(
      {
        x: cell?.x,
        y: cell?.y,
        width: cell?.width,
        height: cell?.height,
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

  const row2 = bounds.place({
    y: row1.y - bounds.y + rowH + 1,
    width: W,
    height: rowH,
  });
  const row2Cells = splitRect(row2, {
    direction: 'horizontal',
    constraints: ['1fr', '1fr', '1fr'],
    gap: 2,
  });

  // Showcase Row 2 (Industrial)
  industrialStyles.forEach((cfg, i) => {
    const cell = row2Cells[i];
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
        x: cell?.x,
        y: cell?.y,
        width: cell?.width,
        height: cell?.height,
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

  const table = bounds.place({
    y: row2.y - bounds.y + rowH + 2,
    width: W,
  });

  box(
    {
      x: table.x,
      y: table.y,
      width: table.width,
      border: 'none',
      padding: [0, 0],
    },
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
