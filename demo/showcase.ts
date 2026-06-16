import { Box } from '../src/components';
import {
  ICON_MAP,
  joinHorizontal,
  box as renderBox,
  splitRect,
  truncate,
} from '../src/index';
import { demo } from './demo-layout';

const PALETTE = [
  'bunti-blue',
  'sky',
  'plasma',
  'rose',
  'gold',
  'mint',
  'success',
  'warning',
  'error',
];

const BORDERS = ['default', 'rounded', 'double', 'dashed', 'frame'] as const;

demo('SHOWCASE', (ctx, bounds) => {
  const { color, gradient, icon } = ctx;
  const width = Math.min(bounds.w - 4, 104);
  const shell = bounds.place({
    y: 0,
    width,
    height: Math.min(bounds.h, 27),
  });
  const [left, right] = splitRect(shell, {
    direction: 'horizontal',
    constraints: ['44%', '1fr'],
    gap: 2,
  });
  const [palette, layout] = splitRect(left!, {
    direction: 'vertical',
    constraints: [11, '1fr'],
    gap: 1,
  });
  const [frames, textLab, iconLab] = splitRect(right!, {
    direction: 'vertical',
    constraints: [8, 9, '1fr'],
    gap: 1,
  });

  Box(
    ctx,
    {
      x: palette?.x,
      y: palette?.y,
      width: palette?.width,
      height: palette?.height,
      border: 'rounded',
      borderColor: 'bunti-blue',
      padding: [1, 2],
    },
    ({ text }) => {
      text(color.fg('bunti-blue', color.bold('COLOR SYSTEM\n')));
      for (const [index, name] of PALETTE.entries()) {
        if (index > 0 && index % 3 === 0) text('\n');
        text(color.dim(name.padEnd(12)));
        text(color.fg(name, '████'));
        text('  ');
      }
    },
  );

  Box(
    ctx,
    {
      x: layout?.x,
      y: layout?.y,
      width: layout?.width,
      height: layout?.height,
      border: 'rounded',
      borderColor: 'mint',
      padding: [1, 2],
    },
    ({ text }) => {
      text(color.fg('mint', color.bold('RECT LAYOUT\n\n')));
      text(color.dim('splitRect: fixed + percent + fill tracks\n\n'));

      const tracks = splitRect(
        { x: 0, y: 0, width: Math.max(1, (layout?.width ?? 8) - 6), height: 3 },
        {
          direction: 'horizontal',
          constraints: [8, '35%', '1fr'],
          gap: 1,
        },
      );

      const blocks = tracks.map((track, index) =>
        renderBox(
          color.fg(
            'white',
            index === 0 ? '8 cols' : index === 1 ? '35%' : 'fill',
          ),
          {
            width: track.width,
            height: track.height,
            border: 'none',
            bgColor: index === 0 ? 'ocean' : index === 1 ? 'nebula' : 'plasma',
            align: 'center',
            valign: 'middle',
          },
        ),
      );
      text(joinHorizontal(...blocks));
      text('\n\n');
      text(color.dim('Content stays inside the assigned Rect.'));
    },
  );

  Box(
    ctx,
    {
      x: frames?.x,
      y: frames?.y,
      width: frames?.width,
      height: frames?.height,
      border: 'rounded',
      borderColor: 'plasma',
      padding: [1, 2],
    },
    ({ text }) => {
      text(color.fg('plasma', color.bold('BORDERS + DEPTH\n\n')));
      const cells = splitRect(
        { x: 0, y: 3, width: Math.max(1, (frames?.width ?? 8) - 6), height: 3 },
        {
          direction: 'horizontal',
          constraints: BORDERS.map(() => '1fr'),
          gap: 1,
        },
      );

      const blocks = BORDERS.map((border, index) => {
        const cell = cells[index]!;
        return renderBox(
          color.fg('silver', truncate(border, Math.max(1, cell.width - 2))),
          {
            width: cell.width,
            height: cell.height,
            border,
            borderColor: index % 2 === 0 ? 'silver' : 'gold',
            align: 'center',
            valign: 'middle',
          },
        );
      });
      text(joinHorizontal(...blocks));
    },
  );

  Box(
    ctx,
    {
      x: textLab?.x,
      y: textLab?.y,
      width: textLab?.width,
      height: textLab?.height,
      border: 'rounded',
      borderColor: 'gold',
      padding: [1, 2],
    },
    ({ text, box }) => {
      text(color.fg('gold', color.bold('TEXT + GRADIENTS\n\n')));
      const bar = gradient({
        colors: ['sky', 'plasma', 'rose', 'gold', 'mint'],
        direction: 'horizontal',
        steps: Math.max(1, (textLab?.width ?? 8) - 6),
      });
      box(
        {
          width: '100%',
          height: 1,
          border: 'none',
          bgColor: bar,
        },
        () => {},
      );
      text('\n');
      text(
        color.fg(
          'silver',
          'Wrapped text respects ANSI colors and terminal width without escape damage.',
        ),
      );
    },
  );

  Box(
    ctx,
    {
      x: iconLab?.x,
      y: iconLab?.y,
      width: iconLab?.width,
      height: iconLab?.height,
      border: 'rounded',
      borderColor: 'silver',
      padding: [1, 2],
    },
    ({ text, table }) => {
      text(color.fg('silver', color.bold('ICONS + TABLES\n\n')));
      const rows = Object.keys(ICON_MAP)
        .slice(0, 12)
        .reduce<string[][]>((acc, name, index) => {
          const row = Math.floor(index / 3);
          acc[row] ??= [];
          acc[row]!.push(`${icon(name)} ${color.dim(name)}`);
          return acc;
        }, []);

      table(rows, {
        width: Math.max(1, (iconLab?.width ?? 8) - 6),
        border: 'none',
        padding: [0, 1],
        columns: [{ align: 'left' }, { align: 'left' }, { align: 'left' }],
      });
    },
  );
});
