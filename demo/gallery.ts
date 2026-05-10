import { bunti, BorderStyle, ICON_MAP } from "../src/index";

/**
 * Bunti Visual Gallery
 * THE GOLD STANDARD: Perfectly Aligned industrial columns using rigid layout nodes.
 */

bunti.render(
  ({
    wallpaper,
    box,
    color,
    width,
    height,
    gradient,
    joinHorizontal,
    joinVertical,
    table
  }) => {
    wallpaper(233);

    const MASTER_WIDTH = 84;
    const START_X = Math.floor((width - MASTER_WIDTH) / 2);

    // 1. Header (Centered, Minimalist)
    box({ 
      anchor: 'top', 
      y: 1, 
      align: 'center', 
      border: 'none'
    }, ({ text }) => {
      text(color.white(color.bold(" BUNTI :: VISUAL REGISTRY ")));
    });

    // 2. Color Spectrum (Locked to Master Grid)
    const specGrad = gradient({ 
      colors: ['midnight', 'ocean', 'sky', 'nebula', 'plasma', 'rose', 'gold'], 
      direction: 'horizontal', 
      steps: MASTER_WIDTH 
    });

    box({ 
      x: START_X,
      y: 4, 
      width: MASTER_WIDTH, 
      height: 1, 
      bgColor: specGrad, 
      border: 'none',
      padding: [0, 0]
    }, () => {});

    // 3. Style Showcase (Rigid Row, 3 boxes)
    // 26 * 3 + 4 * 2 gaps = 86 (Wait, let's use MASTER_WIDTH = 88)
    const W = 88;
    const X = Math.floor((width - W) / 2);
    const boxW = 28;
    const gapX = 2;
    const rowH = 7;

    const wireStyles = ["default", "rounded", "double"] as const;
    const industrialStyles = [
      { name: "FRAME", border: "frame", bg: "midnight", label: "Side Colors" },
      { name: "THICK-FRAME", border: "thick-frame", bg: "ocean", label: "Ocean" },
      {
        name: "WRAPPING",
        border: "frame",
        bg: 234,
        label: "Surgical",
        wrap: true,
        content: "LONG TEXT THAT WRAPS SURGICALLY",
      },
    ];

    // Showcase Row 1 (Wireframe)
    wireStyles.forEach((style, i) => {
      box({
        x: X + i * (boxW + gapX),
        y: 6,
        width: boxW,
        height: rowH,
        border: style as any,
        borderColor: color.gray,
        align: 'center',
        valign: 'middle'
      }, ({ text }) => {
        text(`${style.toUpperCase()}\n(Wireframe)`);
      });
    });

    // Showcase Row 2 (Industrial)
    industrialStyles.forEach((cfg, i) => {
      const borderColor = cfg.label === "Side Colors" ? {
        top: color.lighten(cfg.bg, 30),
        bottom: color.darken(cfg.bg, 30),
        left: color.lighten(cfg.bg, 15),
        right: color.darken(cfg.bg, 15),
      } : color.lighten(cfg.bg, 40);

      box({
        x: X + i * (boxW + gapX),
        y: 14,
        width: boxW,
        height: rowH,
        border: cfg.border as any,
        borderColor: borderColor,
        bgColor: cfg.bg,
        align: 'center',
        valign: 'middle',
        wrap: cfg.wrap,
        padding: [1, 2]
      }, ({ text }) => {
        text(cfg.content || `${cfg.name}\n(${cfg.label})`);
      });
    });

    // 4. Icon Manifest (Rigid Grid - THE REFINERY)
    const allIconNames = Object.keys(ICON_MAP);
    const ICON_COLS = 4;
    const rowsCount = Math.ceil(allIconNames.length / ICON_COLS);
    const colW = Math.floor(W / ICON_COLS);

    const tableData: string[][] = [];
    for (let r = 0; r < rowsCount; r++) {
      const row: string[] = [];
      for (let c = 0; c < ICON_COLS; c++) {
        const idx = r * ICON_COLS + c;
        const name = allIconNames[idx];
        if (name) {
          const glyph = bunti.icon(name);
          // RIGID SLOTS: icon(4) + label(rest)
          const iconSlot = bunti.box(glyph, { width: 4, border: 'none', padding: [0, 0], align: 'left' });
          const labelSlot = bunti.box(color.dim(name), { width: colW - 4, border: 'none', padding: [0, 0], align: 'left' });
          row.push(joinHorizontal(iconSlot, labelSlot));
        } else {
          row.push(" ");
        }
      }
      tableData.push(row);
    }

    // Render the table manifest bound strictly to the same X and W as the boxes above
    box({ x: X, y: 23, width: W, border: 'none', padding: [0, 0] }, ({ table }) => {
      table(tableData, { 
        width: W, 
        padding: [0, 0], 
        border: 'none',
        columns: [
          { align: 'left' },
          { align: 'left' },
          { align: 'left' },
          { align: 'left' }
        ]
      });
    });

    // 5. Footer (Anchored Bottom)
    box({ 
      anchor: 'bottom', 
      color: 'gray', 
      align: 'center', 
      border: 'none',
      padding: [0, 0]
    }, ({ text }) => {
      text(` Bunti Visual Standards: 24-bit Color | ${allIconNames.length} Tactical Icons | Unified Borders `);
    });
  },
  { fps: 10, mouse: true, alternateBuffer: true, hideCursor: true },
);
