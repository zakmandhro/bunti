/**
 * Bunti Experiment: Advanced Layout Flow & Clipping
 * Updated for Async API & Core DSL
 */

import { render, box as layoutBox, fg, icon, viewport } from '../src/index';

// --- The Experiment ---

let scrollPos = 0;
let direction = 1;

render(({ wallpaper, width, height, blit, state }) => {
  // 1. Deep Space Background
  wallpaper(232);

  // 2. Animated Scroll
  scrollPos += 0.05 * direction;
  if (scrollPos > 30 || scrollPos < 0) direction *= -1;

  // 3. Main Dashboard Layout (Columns)
  const sideWidth = Math.floor(width * 0.25);
  const mainWidth = width - sideWidth - 4;

  // LEFT COLUMN
  const sidebar = layoutBox("NAV SYSTEM\n----------\nStatus: OK\nUptime: 1047s\nLoad: 0.12", {
    width: sideWidth,
    height: height - 4,
    border: 'rounded',
    borderColor: (s) => fg('blue', s)
  });

  // RIGHT COLUMN: Main Content with Clipping Viewport
  const longContent = Array.from({ length: 50 }, (_, i) => 
    `  ${icon('bullet')} System Log Entry #${i.toString().padStart(3, '0')} ... [ONLINE]`
  ).join('\n');

  const clippedView = viewport(longContent, mainWidth - 4, height - 8, Math.floor(scrollPos));

  const mainStage = layoutBox(clippedView, {
    width: mainWidth,
    height: height - 4,
    border: 'rounded',
    borderColor: (s) => fg('white', s),
    align: 'left',
    valign: 'top'
  });

  // 4. Blit columns
  blit(1, 2, sidebar);
  blit(sideWidth + 2, 2, mainStage);

  // Header
  const header = ` ${icon('rocket')} BUNTI MISSION CONTROL | ${new Date().toLocaleTimeString()} `;
  const headerPos = Math.floor((width - header.length) / 2);
  blit(headerPos, 0, fg('white', fg('bgBlue', header)));

}, { fps: 60 });
