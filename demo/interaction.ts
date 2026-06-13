import { Box, Button, Input } from '../src/components';
import { demo } from './demo-layout';

/**
 * Interactive Components Showcase
 */

demo('INTERACTIVE COMPONENTS', (ctx, bounds) => {
  const { color, icon } = ctx;
  const W = Math.min(bounds.w - 8, 72);
  const panel = bounds.place({
    y: 1,
    width: W,
    height: Math.min(bounds.h - 1, 13),
  });
  const compact = W < 60;

  Box(
    ctx,
    {
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      border: 'rounded',
      borderColor: 'bunti-blue',
      padding: [1, compact ? 1 : 3],
      align: 'left',
    },
    (sub) => {
      const ghostW = 5;
      const primaryW = compact ? 14 : 15;
      const actionGap = 2;
      const actionRowW = ghostW + actionGap + primaryW;
      const actionRow = sub.resolveLocalRect(
        {
          y: 8,
          width: actionRowW,
          height: 1,
        },
        { defaultX: 'right', defaultY: 'top' },
      );
      const actionY = 8;

      sub.text(color.cyan(color.bold('TACTICAL CONTROLS')));
      sub.text('\n');
      sub.text(color.dim('Keyboard, mouse, focus, and rerender states.'));
      sub.text('\n\n');

      Input(sub, {
        id: 'input-mission',
        label: 'MISSION:',
        placeholder: 'Enter mission name...',
        width: compact ? W - 8 : 48,
      });

      sub.text('\n');
      sub.text(color.dim(`Last key: ${ctx.lastKey || 'none'}`));
      sub.text(color.dim(`    Mouse: ${ctx.mouseX},${ctx.mouseY}`));
      sub.text('\n\n');

      const abort = Button(sub, {
        id: 'btn-abort',
        label: 'Abort',
        variant: 'ghost',
        width: ghostW,
        x: actionRow.x,
        y: actionY,
        detach: true,
      }) as unknown as string;

      const deploy = Button(sub, {
        id: 'btn-deploy',
        label: 'Deploy',
        icon: icon('rocket'),
        variant: 'primary',
        width: primaryW,
        x: actionRow.x + ghostW + actionGap,
        y: actionY,
        detach: true,
        onClick: () => {
          /* Action handled here */
        },
      }) as unknown as string;

      sub.text(
        `${' '.repeat(actionRow.x)}${abort}${' '.repeat(actionGap)}${deploy}`,
      );
    },
  );
});
