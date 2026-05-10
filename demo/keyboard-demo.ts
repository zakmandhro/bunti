import { render, KEYS } from '../src/index';

let x = 10;
let y = 10;
let lastKeyPressed = 'None';

render((ctx) => {
  const { lastKey } = ctx;

  if (lastKey) {
    lastKeyPressed = lastKey === '\r' ? 'ENTER' : 
                     lastKey === '\t' ? 'TAB' : 
                     lastKey === ' ' ? 'SPACE' : 
                     lastKey.replace('\x1b', 'ESC');
    
    if (lastKey === KEYS.UP) y--;
    if (lastKey === KEYS.DOWN) y++;
    if (lastKey === KEYS.LEFT) x--;
    if (lastKey === KEYS.RIGHT) x++;
  }

  ctx.wallpaper('#1a1a1a');

  ctx.box({ x, y, padding: [1, 2], title: ' Keyboard Demo ' }, (sub) => {
    sub.text('Use arrow keys to move this box!\n');
    sub.text(`Last Key: ${lastKeyPressed}\n`);
    sub.text('Press q to quit.');
  });

  if (lastKey === 'q') {
    process.exit(0);
  }
}, { fps: 60 });
