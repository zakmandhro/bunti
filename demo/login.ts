import { Button, Card, Input } from '../src/components';
import { demo } from './demo-layout';

/**
 * Sign-In Demo — web-app style auth form rendered in the terminal.
 */

demo('AUTHENTICATION', (ctx, bounds) => {
  const {
    color,
    icon,
    useState,
    lastKey,
    focus,
    isFocused,
    mouseX,
    mouseY,
    isMouseDown,
    offsetX,
    offsetY,
  } = ctx;

  const [email] = useState('input-email', '');
  const [password] = useState('input-password', '');
  const [status, setStatus] = useState('login-status', 'idle');
  const [error, setError] = useState('login-error', '');
  const [progress, setProgress] = useState('login-progress', 0);
  const [forgotHovered, setForgotHovered] = useState('forgot-hovered', false);
  const [forgotNotice, setForgotNotice] = useState('forgot-notice', '');

  const subtleTitle = { r: 140, g: 140, b: 140 };
  const mutedText = { r: 110, g: 110, b: 110 };
  const linkColor = { r: 37, g: 99, b: 235 }; // bootstrap-ish blue
  const linkHover = { r: 29, g: 78, b: 200 };

  const handleLogin = () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setError('');
    setForgotNotice('');
    setStatus('loading');
    setProgress(0);
  };

  if (lastKey === 'q') process.exit(0);

  if (status === 'loading') {
    if (progress < 1) {
      const step = ctx.flicker(0.1) ? 0.05 : 0.01;
      setProgress(Math.min(1, progress + step));
    } else {
      setStatus('success');
    }
  }

  // Success screen
  if (status === 'success') {
    const W = Math.min(bounds.w - 8, 60);
    const X = bounds.centerW(W);

    Card(
      ctx,
      {
        x: X,
        y: bounds.y + 4,
        width: W,
        height: 12,
        title: 'Welcome back',
        theme: 'accent',
        bgColor: { r: 250, g: 249, b: 246 },
      },
      (sub) => {
        sub.text(`\n ${icon('check')} ${color.bold("You're signed in")}\n\n`);
        sub.text(
          ` Hi ${color.bold(email.split('@')[0])}, your session is now active.\n\n`,
        );

        Button(sub, {
          id: 'btn-logout',
          label: 'Sign out',
          icon: icon('exit'),
          variant: 'danger',
          onClick: () => {
            setStatus('idle');
            setProgress(0);
            setError('');
          },
        });
      },
    );
    return;
  }

  // Sign-in form
  const W = Math.min(bounds.w - 8, 50);
  const X = bounds.centerW(W);
  const Y = Math.max(bounds.y, Math.floor((bounds.h - 24) / 2));

  Card(
    ctx,
    {
      x: X,
      y: Y,
      width: W,
      height: 26,
      border: 'rounded',
      theme: error ? 'danger' : 'accent',
      bgColor: { r: 250, g: 249, b: 246 },
    },
    (sub) => {
      // Brand logo — centered, nerd-font glyph + bold "Bunti"
      const brandVisible = 2 + 1 + 5; // glyph(2) + space + "Bunti"(5)
      const innerW0 = W - 4;
      const logoPad = ' '.repeat(
        Math.max(0, Math.floor((innerW0 - brandVisible) / 2)),
      );
      const purple = { r: 147, g: 51, b: 234 };
      const brand = color.fg(purple, color.bold(`${icon('bunti')} Bunti`));
      sub.text(`${logoPad + brand}\n\n`);

      sub.text(
        color.fg(mutedText, `Sign in to your Bunti account to continue.\n`),
      );
      sub.text(
        color.fg(
          mutedText,
          `Use ${color.bold('Tab')} or your mouse to move between fields.\n\n`,
        ),
      );

      // Email — label on its own line, Bootstrap style
      sub.text(`${color.fg(subtleTitle, color.bold('Email address'))}\n`);
      Input(sub, {
        id: 'input-email',
        placeholder: 'you@bunti.net',
        width: '100%',
      });

      sub.text('\n');

      // Password — label on its own line
      sub.text(`${color.fg(subtleTitle, color.bold('Password'))}\n`);
      Input(sub, {
        id: 'input-password',
        placeholder: 'Enter your password',
        type: 'password',
        width: '100%',
      });

      if (isFocused('input-email') && lastKey === 'enter')
        focus('input-password');
      if (isFocused('input-password') && lastKey === 'enter') handleLogin();

      sub.text('\n\n');

      if (status === 'loading') {
        const barW = W - 14;
        const filled = Math.floor(barW * progress);
        const bar =
          color.black('█'.repeat(filled)) +
          color.dim('░'.repeat(barW - filled));
        sub.text(
          ` ${icon('loading')} ${color.dim('Signing in ')} [${bar}] ${color.bold(`${Math.floor(progress * 100)}%`)}`,
        );
      } else {
        Button(sub, {
          id: 'btn-login',
          label: 'Sign in',
          icon: icon('lock'),
          variant: 'primary',
          width: '100%',
          onClick: handleLogin,
        });
      }

      sub.text('\n');

      // "Forgot password?" link — hover + click
      const linkText = 'Forgot password?';
      const linkY = sub.cursorY;
      const linkAbsY = offsetY + linkY;
      // approximate centered position inside card padding
      const pad = 2;
      const innerW = W - pad * 2;
      const linkX = offsetX + pad + Math.floor((innerW - linkText.length) / 2);
      const hovered =
        mouseX >= linkX &&
        mouseX < linkX + linkText.length &&
        mouseY === linkAbsY;
      if (hovered !== forgotHovered) setForgotHovered(hovered);
      if (hovered && isMouseDown) {
        setForgotNotice('Password reset link sent to your email.');
      }

      const styled = hovered
        ? color.fg(linkHover, color.bold(linkText))
        : color.fg(linkColor, linkText);
      const padLeft = ' '.repeat(
        Math.max(0, Math.floor((innerW - linkText.length) / 2)),
      );
      sub.text(padLeft + styled);

      if (error) {
        sub.text(`\n\n ${color.fg('error', `${icon('warning')} ${error}`)}`);
      } else if (forgotNotice) {
        sub.text(
          `\n\n ${color.fg(mutedText, `${icon('check')} ${forgotNotice}`)}`,
        );
      }
    },
  );
});
