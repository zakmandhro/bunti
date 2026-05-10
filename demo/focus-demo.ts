import { render, KEYS } from '../src/index';

const items = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const missions = ['Voyager 1', 'Voyager 2', 'Cassini', 'New Horizons', 'Juno'];

render((ctx) => {
  ctx.wallpaper('#0a0a0a');

  ctx.box({ title: ' Bunti Focus Demo ', padding: [1, 2] }, (main) => {
    main.text('Press TAB to switch focus between lists.\n');
    main.text('Use UP/DOWN to navigate.\n\n');

    main.box({ 
      title: main.isFocused('planets') ? '[ PLANETS ]' : ' planets ',
      borderColor: (s) => main.isFocused('planets') ? main.color.cyan(s) : main.color.gray(s),
      padding: [0, 2],
      align: 'left'
    }, (sub) => {
      sub.list('planets', items, {
        focusStyle: (s) => main.color.bold(main.color.cyan(`> ${s.trim()}`)),
        maxVisible: 4
      });
    });

    main.text('\n');

    main.box({ 
      title: main.isFocused('missions') ? '[ MISSIONS ]' : ' missions ',
      borderColor: (s) => main.isFocused('missions') ? main.color.magenta(s) : main.color.gray(s),
      padding: [0, 2],
      align: 'left'
    }, (sub) => {
      sub.list('missions', missions, {
        focusStyle: (s) => main.color.bold(main.color.magenta(`> ${s.trim()}`))
      });
    });

    main.text('\nPress q to quit.');
  });

  if (ctx.lastKey === 'q') process.exit(0);
}, { fps: 60 });
