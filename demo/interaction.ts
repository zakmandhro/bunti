import { bunti, KEYS } from '../src/index';

/**
 * Bunti Interaction Standard
 * Consolidating Mouse Tracking, Keyboard Navigation, and Focus Management.
 */

let lastKeyPressed = 'None';
let x = 10;
let y = 10;

bunti.render(({ wallpaper, box, color, width, height, blit, mouseX, mouseY, mouseButton, lastKey, isFocused, focusNext }) => {
  wallpaper(234);

  // 1. Process Input
  if (lastKey) {
    lastKeyPressed = lastKey === '\r' ? 'ENTER' : 
                     lastKey === '\t' ? 'TAB' : 
                     lastKey === ' ' ? 'SPACE' : 
                     lastKey.replace('\x1b', 'ESC');
    
    // Global navigation for the "Movable" box
    if (lastKey === KEYS.UP) y--;
    if (lastKey === KEYS.DOWN) y++;
    if (lastKey === KEYS.LEFT) x--;
    if (lastKey === KEYS.RIGHT) x++;

    if (lastKey === KEYS.TAB) focusNext();
  }

  // 2. Header
  const header = ` ${color.bold(color.white('BUNTI :: INTERACTION STANDARDS'))} `;
  blit(Math.floor((width - header.length) / 2), 1, color.bgMagenta(header));

  // 3. Mouse Crosshair (Dynamic)
  for (let dy = 0; dy < height; dy++) {
    blit(mouseX, dy, color.dim('│'), { raw: true });
  }
  for (let dx = 0; dx < width; dx++) {
    blit(dx, mouseY, color.dim('─'), { raw: true });
  }
  blit(mouseX, mouseY, color.bold(color.yellow('┼')));

  // 4. Keyboard & State Box (Movable)
  box({
    x, y,
    width: 30,
    height: 6,
    border: 'rounded',
    borderColor: color.yellow,
    title: ' DRAGGABLE CORE '
  }, ({ text }) => {
    text(`LAST KEY: ${color.cyan(lastKeyPressed)}\n`);
    text(`MOUSE X:  ${color.green(mouseX.toString())}\n`);
    text(`MOUSE Y:  ${color.green(mouseY.toString())}\n`);
    text(`BUTTON:   ${color.magenta(mouseButton.toString())}`);
  });

  // 5. Focus & Components (Fixed)
  const compW = 25;
  const compX = width - compW - 4;
  
  box({
    id: 'btn1',
    x: compX,
    y: 4,
    width: compW,
    border: 'frame',
    title: ' COMPONENT A '
  }, ({ text }) => {
    const status = isFocused('btn1') ? color.green('FOCUS ACTIVE') : color.gray('IDLE');
    text(`\n   ${status}`);
  });

  box({
    id: 'btn2',
    x: compX,
    y: 9,
    width: compW,
    border: 'frame',
    title: ' COMPONENT B '
  }, ({ text }) => {
    const status = isFocused('btn2') ? color.green('FOCUS ACTIVE') : color.gray('IDLE');
    text(`\n   ${status}`);
  });

  // Footer
  const footer = " Bunti Interaction: Mouse SGR | Scoped Focus | Keyboard Event Mapping ";
  blit(Math.floor((width - footer.length) / 2), height - 1, color.gray(footer));

}, { fps: 60, mouse: true });
