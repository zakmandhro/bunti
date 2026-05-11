import { demo } from "./demo-layout";
import { Button } from "../src/components/Button";

/**
 * Interactive Components Showcase
 */

demo("INTERACTIVE COMPONENTS", (ctx, bounds) => {
  const { box, color, icon } = ctx;
  const W = Math.min(bounds.w - 8, 100);
  const X = bounds.centerW(W);

  box({
    x: X,
    y: bounds.y,
    width: W,
    height: bounds.h,
    border: 'rounded',
    borderColor: 'cyan',
    padding: [1, 2]
  }, (sub) => {
    sub.text(color.cyan(color.bold("TACTICAL CONTROLS\n\n")));
    
    sub.text("Press [TAB] to navigate focus.\n\n");

    Button(sub, {
      id: 'btn-deploy',
      label: 'DEPLOY SYSTEM',
      icon: icon('rocket'),
      variant: 'primary',
      onClick: () => { /* Action handled here */ }
    });

    sub.text("\n");

    Button(sub, {
      id: 'btn-abort',
      label: 'ABORT',
      icon: icon('error'),
      variant: 'danger'
    });
  });
});
