bunti.render((b) => {
  b.wallpaper({ color: 'blue' });

  b.box(
    {
      size: 'auto',
      bgColor: 'white',
      color: 'blank',
    },
    (_box) => {
      b.span({ color: 'black' }, (_span) => {
        b.text('Hello, World!');
        b.icon('bun');
      });
    },
  );
});
