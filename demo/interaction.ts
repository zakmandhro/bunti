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
      height: Math.min(bounds.h - 1, 18),
      border: 'rounded',
      borderColor: 'bunti-blue',
      padding: [1, compact ? 1 : 3],
    },
    (sub) => {
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

      Button(sub, {
        id: 'btn-deploy',
        label: 'DEPLOY SYSTEM',
        icon: icon('rocket'),
        variant: 'primary',
        width: compact ? W - 12 : 24,
        onClick: () => {
          /* Action handled here */
        },
      });

      sub.text('\n');

      Button(sub, {
        id: 'btn-abort',
        label: 'ABORT',
        icon: icon('error'),
        variant: 'danger',
        width: compact ? W - 12 : 16,
      });
    },
  );
});
