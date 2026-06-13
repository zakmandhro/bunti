import { Button, Input } from '../src/components';
import { demo } from './demo-layout';

/**
 * Interactive Components Showcase
 */

demo('INTERACTIVE COMPONENTS', (ctx, bounds) => {
  const { box, color, icon } = ctx;
  const W = Math.min(bounds.w - 8, 72);
  const X = bounds.centerW(W);
  const compact = W < 60;

  box(
    {
      x: X,
      y: bounds.y + 1,
      width: W,
      height: Math.min(bounds.h - 1, 13),
      border: 'rounded',
      borderColor: 'bunti-blue',
      padding: [1, compact ? 1 : 3],
    },
    (sub) => {
      const panelInnerW = W - 2 - (compact ? 2 : 6);
      const ghostW = 8;
      const primaryW = compact ? 18 : 20;
      const actionGap = 3;
      const actionRowW = ghostW + actionGap + primaryW;
      const actionLeft = Math.max(0, panelInnerW - actionRowW);

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
        x: actionLeft,
        detach: true,
      }) as unknown as string;

      const deploy = Button(sub, {
        id: 'btn-deploy',
        label: 'Deploy',
        icon: icon('rocket'),
        variant: 'primary',
        width: primaryW,
        x: actionLeft + ghostW + actionGap,
        detach: true,
        onClick: () => {
          /* Action handled here */
        },
      }) as unknown as string;

      sub.text(
        `${' '.repeat(actionLeft)}${abort}${' '.repeat(actionGap)}${deploy}`,
      );
    },
  );
});
