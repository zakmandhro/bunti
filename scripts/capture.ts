import { bunti } from '../src/index';

// We'll run the dashboard demo and capture its exact ANSI buffer string.
bunti.render(
  ({ wallpaper, box, color, width, height, list }) => {
    wallpaper('#0a0a0b');

    // 1. Header
    box({ border: 'none', padding: [1, 2], x: 2, y: 1 }, ({ span, text }) => {
      text('🛰️ ');
      span({ color: 'bunti-blue', bold: true }, ({ text }) =>
        text('SPACE STATION'),
      );
      text('   v1.2   |   ');
      span({ color: 'success' }, ({ text }) => text('● SYSTEM NOMINAL'));
    });

    // 2. Main Grid
    box(
      { border: 'none', width: width - 4, height: height - 4, x: 2, y: 3 },
      ({ box }) => {
        // Left Column (Navigation & Status)
        box({ width: 30, height: '100%', border: 'none' }, ({ box }) => {
          box(
            { border: 'frame', borderColor: '#333', padding: [1, 2] },
            ({ text, span }) => {
              span({ color: 'ash' }, ({ text }) => text('ACTIVE DEPLOYMENTS'));
              text('\n\n');
              list('planets', [
                'Earth - main',
                'Mars - feat/rover',
                'Venus - fix/acid',
              ]);
            },
          );

          box(
            {
              border: 'frame',
              borderColor: '#333',
              height: 10,
              padding: [1, 2],
              valign: 'middle',
            },
            ({ text }) => {
              text(color.fg('error', 'WARNING:\nTelemetry Offline'));
            },
          );
        });

        // Right Column (Main View)
        box(
          { border: 'frame', borderColor: 'bunti-blue', padding: [1, 2] },
          ({ box, text, span }) => {
            span({ color: 'sky' }, ({ text }) => text('ISSUES (3)'));
            text('\n\n');
            box({ bgColor: '#111', padding: [1, 2] }, ({ text }) => {
              text('#42 Atmosphere leaking on Mars');
            });
            text('\n');
            box({ bgColor: '#111', padding: [1, 2] }, ({ text }) => {
              text('#101 Venus rotation too slow');
            });
          },
        );
      },
    );
  },
  { fps: 1 }, // Run once
);
