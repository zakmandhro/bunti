import { demo } from "./demo-layout";
import { Button, Input, Card } from "../src/components";

/**
 * Authentication Interface Demo
 */

demo("AUTHENTICATION", (ctx, bounds) => {
  const { box, color, icon, joinVertical, useState } = ctx;
  const W = Math.min(bounds.w - 8, 50);
  const X = bounds.centerW(W);
  const Y = Math.max(0, Math.floor((bounds.h - 20) / 2));

  // Managed login state
  const [status, setStatus] = useState('login-status', 'Awaiting clearance...');

  Card(ctx, {
    x: X,
    y: Y,
    width: W,
    height: 18,
    title: "Secure Terminal Access",
    theme: 'accent'
  }, (sub) => {
    
    sub.text("Please authenticate to access the Bunti network.\nUse [TAB] or Mouse to select fields.\n\n");

    Input(sub, {
      id: 'input-email',
      label: 'EMAIL:   ',
      placeholder: 'operator@bunti.net',
      width: '100%'
    });

    sub.text("\n");

    Input(sub, {
      id: 'input-password',
      label: 'PASSWORD:',
      placeholder: 'Enter clearance code...',
      type: 'password',
      width: '100%'
    });

    sub.text("\n\n");

    Button(sub, {
      id: 'btn-login',
      label: 'AUTHENTICATE',
      icon: icon('lock'),
      variant: 'primary',
      width: '100%',
      onClick: () => { 
        setStatus("Authentication Sequence Initiated...");
      }
    });

    sub.text(`\n\n${color.dim('STATUS: ')} ${color.fg('plasma', status)}`);
  });
});
