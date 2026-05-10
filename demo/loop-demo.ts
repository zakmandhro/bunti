import { bunti } from '../src/index';
import pc from 'picocolors';

/**
 * Bunti Render Loop & Screen Buffer Demo
 */

const screen = new bunti.Screen({
  fps: 30,
  alternateBuffer: true,
  hideCursor: true
});

const buffer = new bunti.ScreenBuffer(screen.width, screen.height);
let frame = 0;

const run = async () => {
  await bunti.init();

  screen.start((s) => {
    // 1. Update Buffer Dimensions if resized
    if (buffer.width !== s.width || buffer.height !== s.height) {
      buffer.width = s.width;
      buffer.height = s.height;
      buffer.clear();
    }

    // 2. Clear and Draw Background
    buffer.clear();
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const color = 232 + (Math.floor((x + y + frame) / 5) % 10);
        buffer.setCell(x, y, { char: '·', fg: color });
      }
    }

    // 3. Render a UI Box on top using layout engine
    const panel = bunti.createStyle({
      border: 'rounded',
      borderColor: pc.cyan,
      padding: [1, 2],
      width: 50
    });

    const ui = bunti.joinVertical(
      bunti.box(pc.bold("🛰️  BUNTI RENDER LOOP"), { align: 'center', width: 50, border: 'normal', borderColor: pc.magenta }),
      panel(
        pc.blue("CORE TELEMETRY\n") + 
        `FRAME: ${pc.yellow(frame.toString().padStart(6, '0'))}\n` +
        `RESOLUTION: ${pc.green(s.width + 'x' + s.height)}\n` +
        `PALETTE: ${bunti.fg('success', 'SUCCESS')} | ${bunti.fg('warning', 'WARNING')} | ${bunti.fg('error', 'ERROR')}`
      )
    );

    // 4. Overwrite buffer cells with UI content (simple string injection for now)
    // In a real TUI engine, we might want a cleaner way to layer layouts on buffers.
    const uiLines = ui.split('\n');
    const startY = Math.max(0, Math.floor((s.height - uiLines.length) / 2));
    const startX = Math.max(0, Math.floor((s.width - 50) / 2));

    // This is a bit manual, but shows how they work together
    // toString() converts buffer to string, so we return that.
    
    frame++;
    
    // For now, let's just return the UI centered on the screen without the buffer
    // or try to combine them.
    
    // return buffer.toString(); // If we want the background only
    
    // Combining:
    // We can't easily "layer" a multi-line ANSI string onto the ScreenBuffer cells 
    // without parsing ANSI, which is complex.
    // So for this demo, let's just show the UI centered.
    
    return bunti.joinVertical(
        "\n".repeat(startY),
        ...uiLines.map(l => " ".repeat(startX) + l)
    );
  });
};

run();
