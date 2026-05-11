import { bunti } from "../src/index";

/**
 * Color Isolation Demo
 * Minimalist test to verify background rendering.
 */

bunti.render(
  ({
    wallpaper,
    box,
    color,
    width,
    height,
    blit
  }) => {
    // Clear with dark navy
    wallpaper(233);

    // 1. Native bgColor via Box options
    box({
      x: 2,
      y: 2,
      width: 20,
      height: 3,
      bgColor: 'white',
      border: 'none',
      padding: [0, 0]
    }, ({ text }) => {
      text(color.fg(238, " bgColor: 'white' "));
    });

    box({
      x: 24,
      y: 2,
      width: 20,
      height: 3,
      bgColor: 235,
      border: 'none',
      padding: [0, 0]
    }, ({ text }) => {
      text(" bgColor: 235 ");
    });

    box({
      x: 46,
      y: 2,
      width: 20,
      height: 3,
      bgColor: { r: 255, g: 100, b: 100 },
      border: 'none',
      padding: [0, 0]
    }, ({ text }) => {
      text(" bgColor: RGB ");
    });

    // 2. Manual ANSI wrapping via color.bg()
    box({
      x: 2,
      y: 7,
      width: 64,
      height: 3,
      border: 'frame',
      borderColor: 'gray',
      padding: [0, 1]
    }, ({ text }) => {
      text("Manual Wrapper Test: ");
      text(color.bg('white', color.fg(238, " WHITE BG ")));
      text(" | ");
      text(color.bg(235, " GRAY BG "));
      text(" | ");
      text(color.bg({ r: 50, g: 200, b: 50 }, " GREEN RGB "));
    });

    // 3. Raw Text without box
    blit(2, 12, color.bg('white', color.fg(0, " RAW BLIT: WHITE BACKGROUND ")));
  },
  { fps: 5, alternateBuffer: true, hideCursor: true, nerdFont: true }
);
