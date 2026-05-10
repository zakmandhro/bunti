bunti.render((b) => {
  b.wallpaper({ color: "blue" });

  b.box(
    {
      size: "auto",
      bgColor: "white",
      color: "blank",
    },
    (box) => {
      b.span({ color: "black" }, (span) => {
        b.text("Hello, World!");
        b.icon("bun");
      });
    },
  );
});
