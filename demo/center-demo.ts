import { render } from '../src/index';

/**
 * Bunti Functional Center Demo
 */

render(({ box, color, width, height, joinVertical }) => {
  box({
    size: Math.min(60, width - 4),
    align: 'center',
    valign: 'middle',
    border: 'rounded',
    borderColor: color.blue,
    padding: [1, 2]
  }, ({ text }) => {
    text(joinVertical(
      color.bold(color.cyan("🛰️  BUNTI FUNCTIONAL ENGINE")),
      color.dim("Double-buffered diffing is online"),
      "",
      color.magenta(`Resolution: ${width}x${height}`),
      color.yellow("This entire UI is diff-rendered!")
    ));
  });
}, {
  fps: 30,
  alternateBuffer: true
});
