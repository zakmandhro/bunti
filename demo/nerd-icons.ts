import { bunti } from '../src/index';
import { ICON_MAP } from '../src/icons';

/**
 * Bunti Nerd Icons v3 Manifest
 * Displaying the full collection of tactical Nerd Font icons.
 */

bunti.render(({ wallpaper, box, color, icon, width, height, blit, joinHorizontal, joinVertical }) => {
  wallpaper(233);

  const allIconNames = Object.keys(ICON_MAP);
  const rows = [];
  const COLUMNS = 4;
  const ENTRY_WIDTH = 25;

  for (let i = 0; i < allIconNames.length; i += COLUMNS) {
    const chunk = allIconNames.slice(i, i + COLUMNS);
    const row = joinHorizontal(
      ...chunk.map(name => {
        const variants = `${color.cyan(ICON_MAP[name].nf)}  ${color.gray(ICON_MAP[name].ascii)}`;
        const iconPart = bunti.box(variants, { 
          border: 'small', 
          padding: [0, 1],
          borderColor: (s: string) => color.cyan(s)
        });
        const label = '\n ' + color.bold(name);
        return bunti.box(joinHorizontal(iconPart, label), { width: ENTRY_WIDTH, border: 'none' });
      })
    );
    rows.push(row);
  }

  const totalWidth = COLUMNS * ENTRY_WIDTH;
  const frame = joinVertical(
    bunti.box(color.bold(color.magenta(`  NERD FONT v3 MANIFEST  `)), { 
      width: totalWidth, 
      align: 'center', 
      border: 'medium', 
      borderColor: (s: string) => color.magenta(s) 
    }),
    '',
    ...rows,
    '',
    bunti.box(color.dim(`Total Tactical Icons: ${allIconNames.length} | Format: [ NF  ASCII ] name`), { 
      width: totalWidth, 
      align: 'center',
      border: 'none'
    })
  );

  const startX = Math.floor((width - totalWidth) / 2);
  blit(startX, 1, frame);

}, { fps: 5 });
