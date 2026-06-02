/**
 * Bunti Experiment: Interactive Button Showcase
 * Updated for Async API & Core DSL
 */

import { fg, box as layoutBox, render, visibleWidth } from '../src/index';

let clickCount = 0;
let lastMessage = 'Awaiting interaction...';

render(
  ({ wallpaper, width, height, color, state, blit, box, rect }) => {
    // 1. Deep Space Background
    wallpaper(233);

    // 2. Status Board (using DSL box with absolute positioning)
    box(
      {
        x: 4,
        y: 2,
        width: width - 8,
        height: 5,
        border: 'thick-line',
        borderColor: (s: string) => fg('yellow', s),
      },
      ({ text: t }) => {
        t(` CLICK COUNT: ${fg('green', clickCount.toString())} \n`);
        t(` LAST ACTION: ${fg('silver', lastMessage)} `);
      },
    );

    // 3. Custom Button Helper (Simulating a component)
    const drawButton = (
      label: string,
      x: number,
      y: number,
      clr: string,
      hover: string,
      active: string,
      onPress: () => void,
    ) => {
      const padding: [number, number] = [0, 2];
      const w = visibleWidth(label) + padding[1] * 2 + 2;
      const h = 3; // 1 content line + 2 border lines

      const isHovered =
        state.mouseX >= x &&
        state.mouseX < x + w &&
        state.mouseY >= y &&
        state.mouseY < y + h;
      const isActive = isHovered && state.isMouseDown;

      if (isActive) onPress();

      const borderColor = isActive ? active : isHovered ? hover : clr;

      const styled = layoutBox(label, {
        padding,
        border: 'rounded',
        borderColor: (s) => fg(borderColor, s),
      });

      blit(x, y, styled);
    };

    const btnY = 10;

    drawButton(' [ CLICK ME ] ', 10, btnY, 'green', 'mint', 'white', () => {
      clickCount++;
      lastMessage = `Button PRESSED at ${new Date().toLocaleTimeString()}`;
    });

    drawButton(' [ RESET ] ', 35, btnY, 'error', 'rose', 'white', () => {
      clickCount = 0;
      lastMessage = 'Counter reset to zero.';
    });

    drawButton(' [ EXIT ] ', 55, btnY, 'silver', 'white', 'gold', () => {
      process.exit(0);
    });

    // Footer
    const msg = ' Hover over buttons to see styles | Click to interact ';
    const xPos = Math.floor((width - msg.length) / 2);
    blit(xPos, height - 2, fg('cyan', msg));
  },
  { fps: 60, mouse: true },
);
