import { bunti } from '../src/index';

const logo = [
  ' ┏━┓ ┏━┓ ┏━┓ ┏━┓ ┏━┓   ┏━┓ ┏┳┓ ┏━┓ ┏┳┓ ┳ ┏━┓ ┏┓┓',
  ' ┗━┓ ┃━┛ ┣━┫ ┃   ┣━    ┗━┓  ┃  ┣━┫  ┃  ┃ ┃ ┃ ┃┃┃',
  ' ┗━┛ ┻   ┻ ┻ ┗━┛ ┗━┛   ┗━┛  ┻  ┻ ┻  ┻  ┻ ┗━┛ ┛┗┛',
];

bunti.render(
  (ctx) => {
    ctx.wallpaper('#000000');

    // Space flickers on in the first 1s, then stays on.
    const spaceProgress = ctx.animate(1000);
    const spaceOn = spaceProgress >= 1;
    const spaceFlicker = spaceOn || ctx.flicker(0.7);

    // Station flickers on after 1.2s
    const stationProgress = ctx.animate(1000, { delay: 1200 });
    const stationOn = stationProgress >= 1;
    const stationFlicker =
      stationOn || (stationProgress > 0 && ctx.flicker(0.7));

    ctx.box({ size: 60, border: 'none' }, (sub) => {
      logo.forEach((line) => {
        const spacePart = line.slice(0, 22);
        const stationPart = line.slice(22);

        if (spaceFlicker) {
          sub.span({ color: spaceOn ? sub.color.cyan : sub.color.gray }, (s) =>
            s.text(spacePart),
          );
        } else {
          sub.text(' '.repeat(spacePart.length));
        }

        if (stationFlicker) {
          sub.span(
            { color: stationOn ? sub.color.magenta : sub.color.gray },
            (s) => s.text(stationPart),
          );
        } else {
          sub.text(' '.repeat(stationPart.length));
        }

        sub.text('\n');
      });

      sub.text('\n');
      if (stationOn) {
        const pulse = Math.sin(ctx.elapsedTime / 200) * 0.5 + 0.5;
        sub.span({ color: sub.rgb(255, Math.floor(255 * pulse), 0) }, (s) => {
          s.text('  >>> SYSTEMS READY <<<');
        });
      } else {
        sub.text('  Booting systems...');
      }
    });

    if (ctx.lastKey === 'q') ctx.requestStop();
  },
  { fps: 60 },
);
