/**
 * Bunti Experiment: Border Style Showcase
 * Updated for Async API & Core Layout
 */

import { render, box as layoutBox, fg } from '../src/index';

render(({ wallpaper, width, height, color, blit }) => {
  // 1. Dark Backdrop
  wallpaper(232);

  const styles = ['thin-line', 'thick-line', 'double-line', 'thick-block', 'thin-block', 'rounded'] as const;
  const boxWidth = 24;
  const boxHeight = 6;
  
  styles.forEach((style, i) => {
    const x = 4 + (i % 3) * (boxWidth + 4);
    const y = 4 + Math.floor(i / 3) * (boxHeight + 2);

    const content = layoutBox(` STYLE: ${style.toUpperCase()} \n Status: ACTIVE `, {
      width: boxWidth,
      height: boxHeight,
      border: style,
      borderColor: (s) => fg('cyan', s),
      align: 'center',
    });

    blit(x, y, content);
  });

  // Footer Instructions
  const msg = " [ BUNTI BORDER SHOWCASE ] ";
  const xPos = Math.floor((width - msg.length) / 2);
  blit(xPos, height - 2, fg('silver', msg));

}, { fps: 10 });
