import { bunti } from '../src/index';
import { ICON_MAP, EMOJI_MAP } from '../src/icons';

/**
 * Bunti Icon & Emoji Showcase
 * Demonstrating automatic emoji-to-NF mapping and tactical iconography.
 */

bunti.render(({ wallpaper, color, width, height, blit }) => {
  // 1. Deep Space Backdrop
  wallpaper(233);

  // 2. Title Header
  const title = ` ${color.bold(color.white('BUNTI :: EMOJI-TO-NERDFONT MAPPING TABLE'))} `;
  blit(Math.floor((width - title.length) / 2), 1, color.bgMagenta(title));

  // 3. Simple Text Table for Emojis
  const emojiEntries = Object.entries(EMOJI_MAP);
  const startY = 4;
  const COL_WIDTH = 25;
  const ROWS_PER_COL = Math.ceil(emojiEntries.length / 3);

  emojiEntries.forEach(([emoji, nf], i) => {
    const colIdx = Math.floor(i / ROWS_PER_COL);
    const rowIdx = i % ROWS_PER_COL;
    
    const x = 10 + (colIdx * COL_WIDTH);
    const y = startY + rowIdx;

    // Use blit with { raw: true } to bypass automatic emoji replacement for the "RAW" emoji
    blit(x, y, color.cyan(emoji), { raw: true });
    
    // The rest of the label can be blitted normally
    blit(x + 4, y, `${color.gray('->')}  ${color.bold(color.white(nf))}`);
  });

  // 4. Highlighted Core Icons (Direct Usage)
  const sectionB_StartY = startY + ROWS_PER_COL + 2;
  const divider = color.dim('─'.repeat(width - 20));
  blit(10, sectionB_StartY - 1, divider);
  blit(10, sectionB_StartY, color.bold(color.white("  CORE TACTICAL ICONS (DIRECT)")));

  const coreIcons = ['rocket', 'branch', 'success', 'warning', 'error', 'loading'];
  coreIcons.forEach((name, i) => {
    const x = 12 + (i * 15);
    const y = sectionB_StartY + 2;
    const iconStr = `${bunti.icon(name)} ${color.dim(name)}`;
    blit(x, y, iconStr);
  });

  // Footer
  const footer = ` Built-in Mappings: ${emojiEntries.length} | Automatic spacing-stability enabled | Ctrl+C to exit `;
  blit(Math.floor((width - footer.length) / 2), height - 1, color.gray(footer));

}, { fps: 5 });
