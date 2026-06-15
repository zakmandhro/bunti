import {
  bunti,
  innerRect,
  type RGB,
  type ScreenState,
  setCell,
  splitRect,
  visibleWidth,
} from '../src/index';

/**
 * Bunti Render Engine Demo
 * Direct buffer animation + Rect layout + clipping + mouse hitboxes.
 */

let frameCount = 0;

const mix = (a: RGB, b: RGB, t: number): RGB => ({
  r: Math.round(a.r + (b.r - a.r) * Math.max(0, Math.min(1, t))),
  g: Math.round(a.g + (b.g - a.g) * Math.max(0, Math.min(1, t))),
  b: Math.round(a.b + (b.b - a.b) * Math.max(0, Math.min(1, t))),
});

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const addGlow = (
  base: RGB,
  color: RGB,
  amount: number,
  cx: number,
  cy: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
) => {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const strength = clamp01(1 - dx * dx - dy * dy) * amount;
  return mix(base, color, strength);
};

function vividTextureColor(nx: number, ny: number): RGB {
  let color: RGB = mix(
    { r: 207, g: 74, b: 236 },
    { r: 255, g: 184, b: 72 },
    clamp01((nx + ny * 0.78) / 1.55),
  );

  color = addGlow(
    color,
    { r: 113, g: 230, b: 248 },
    0.74,
    0.5,
    0.12,
    nx,
    ny,
    0.48,
    0.36,
  );
  color = addGlow(
    color,
    { r: 245, g: 72, b: 218 },
    0.44,
    0.1,
    0.28,
    nx,
    ny,
    0.34,
    0.54,
  );
  color = addGlow(
    color,
    { r: 255, g: 236, b: 98 },
    0.58,
    0.82,
    0.78,
    nx,
    ny,
    0.32,
    0.36,
  );
  color = addGlow(
    color,
    { r: 255, g: 246, b: 222 },
    0.22,
    0.56,
    0.42,
    nx,
    ny,
    0.62,
    0.42,
  );

  return {
    r: Math.round(color.r),
    g: Math.round(color.g),
    b: Math.round(color.b),
  };
}

function drawEngineField(state: ScreenState, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      const gradientColor = vividTextureColor(nx, ny);
      setCell(state, x, y, {
        char: '█',
        fg: gradientColor,
        bg: gradientColor,
      });
    }
  }
}

function metric(
  label: string,
  value: string,
  valueColor: (s: string) => string,
  labelColor: (s: string) => string,
) {
  return `${labelColor(label.padEnd(13))} ${valueColor(value)}`;
}

function wrapWords(text: string, width: number) {
  const lines: string[] = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (visibleWidth(next) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

bunti.render(
  (ctx) => {
    const {
      state,
      box,
      color,
      width,
      height,
      mouseX,
      mouseY,
      lastKey,
      requestStop,
      resolveLocalRect,
      hitbox,
      blit,
    } = ctx;

    if (lastKey === 'q') requestStop();

    drawEngineField(state, width, height);

    const frame = frameCount++;
    const textFg = { r: 205, g: 212, b: 224 };
    const softTextFg = { r: 145, g: 152, b: 166 };
    const panelText = (s: string) => color.fg(textFg, s);
    const softText = (s: string) => color.fg(softTextFg, s);
    const shell = innerRect({ x: 0, y: 0, width, height }, 2);
    const compact = width < 92;
    const stageTop = Math.min(6, Math.max(3, Math.floor(height * 0.12)));
    const title = ' 🍭  BUNTI RENDER ENGINE ';
    const titleArea = resolveLocalRect(
      {
        x: 2,
        y: Math.max(1, Math.floor((shell.y + stageTop) / 2)),
        width: Math.max(0, width - 4),
        height: 1,
      },
      { defaultX: 'left', defaultY: 'top' },
    );

    box(
      {
        x: titleArea.x,
        y: titleArea.y,
        width: titleArea.width,
        height: titleArea.height,
        border: 'none',
        align: 'center',
      },
      ({ text }) =>
        text(color.bold(color.fg({ r: 255, g: 255, b: 255 }, title))),
    );

    const stage = innerRect(shell, {
      top: stageTop,
      left: compact ? 1 : 4,
      right: compact ? 1 : 4,
      bottom: 2,
    });
    const [top, bottom] = splitRect(stage, {
      direction: 'vertical',
      constraints: [compact ? '52%' : '50%', '1fr'],
      gap: 1,
    });
    const [telemetry, clipping] = splitRect(top!, {
      direction: compact ? 'vertical' : 'horizontal',
      constraints: ['1fr', '1fr'],
      gap: 2,
    });
    const [hitTargets, colorStack] = splitRect(bottom!, {
      direction: compact ? 'vertical' : 'horizontal',
      constraints: ['1fr', compact ? 7 : '1fr'],
      gap: 2,
    });

    box(
      {
        x: telemetry!.x,
        y: telemetry!.y,
        width: telemetry!.width,
        height: telemetry!.height,
        border: 'none',
        bgColor: { r: 8, g: 10, b: 14 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(
          [
            color.cyan('CORE TELEMETRY'),
            '',
            metric(
              'TICK',
              frame.toString().padStart(6, '0'),
              color.yellow,
              panelText,
            ),
            metric('RESOLUTION', `${width}x${height}`, color.green, panelText),
            metric('MOUSE', `${mouseX},${mouseY}`, color.magenta, panelText),
            metric(
              'MODE',
              compact ? 'STACKED RECTS' : 'SPLIT RECTS',
              color.cyan,
              panelText,
            ),
            '',
            `${color.gray('q')} ${softText('quits')}  ${color.gray('resize')} ${softText('reflows')}  ${color.gray('mouse')} ${softText('lights hitboxes')}`,
          ].join('\n'),
        );
      },
    );

    const clippingText =
      'This panel proves ANSI-aware clipping and wrapping. The same sentence can fold inside one Rect while the neighbor truncates sharply at its boundary without escape-sequence damage.';
    const clippingTextWidth = Math.max(12, clipping!.width - 4);
    const wrappedClipping = wrapWords(clippingText, clippingTextWidth)
      .map(panelText)
      .join('\n');
    const truncatedClipping = wrapWords(
      clippingText.repeat(2),
      clippingTextWidth,
    )
      .slice(0, Math.max(1, clipping!.height - 10))
      .map((line) => color.fg({ r: 160, g: 160, b: 170 }, line))
      .join('\n');
    box(
      {
        x: clipping!.x,
        y: clipping!.y,
        width: clipping!.width,
        height: clipping!.height,
        border: 'none',
        bgColor: { r: 8, g: 8, b: 12 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(`${color.yellow('CLIPPING + WRAP')}\n\n`);
        text(
          `${color.fg(textFg, color.bold('WRAPPED'))}\n${wrappedClipping}\n\n`,
        );
        text(`${color.fg(textFg, color.bold('TRUNCATED'))}\n`);
        text(truncatedClipping);
      },
    );

    box(
      {
        x: hitTargets!.x,
        y: hitTargets!.y,
        width: hitTargets!.width,
        height: hitTargets!.height,
        border: 'none',
        bgColor: { r: 7, g: 11, b: 9 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(`${color.green('HITBOX MAP')}\n\n`);
        text(`${softText('Move the mouse over the bars.')}\n\n`);
      },
    );

    const targetInner = innerRect(hitTargets!, {
      top: 5,
      right: 3,
      bottom: 2,
      left: 3,
    });
    const targetRows = splitRect(targetInner, {
      direction: 'vertical',
      constraints: [1, 1, 1],
      gap: 1,
    });
    const labels = ['layout rect', 'input zone', 'paint layer'];
    const fills = [
      { r: 70, g: 190, b: 255 },
      { r: 255, g: 190, b: 75 },
      { r: 195, g: 110, b: 255 },
    ];

    for (const [index, row] of targetRows.entries()) {
      const id = `engine-demo-target-${index}`;
      const target = hitbox(id, row!);
      const fg = target.hovered
        ? { r: 255, g: 255, b: 255 }
        : { r: 20, g: 24, b: 28 };
      const bg = target.hovered
        ? fills[index]!
        : mix(fills[index]!, { r: 0, g: 0, b: 0 }, 0.45);
      ctx.rect(row!.x, row!.y, row!.width, row!.height, {
        char: ' ',
        bg,
      });
      blit(
        row!.x + 2,
        row!.y,
        `${target.hovered ? '>' : ' '} ${labels[index]!.padEnd(14)} ${target.box.x},${target.box.y},${target.box.width},${target.box.height}`,
        { fg, bg },
      );
    }

    box(
      {
        x: colorStack!.x,
        y: colorStack!.y,
        width: colorStack!.width,
        height: colorStack!.height,
        border: 'none',
        bgColor: { r: 11, g: 8, b: 16 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(
          [
            color.magenta('COLOR ISOLATION'),
            '',
            `${color.bgBlue(color.white(' nested bg '))} ${color.red('red')} ${color.green('green')} ${color.yellow('yellow')}`,
            panelText('ANSI resets stay contained inside composed rows.'),
            '',
            `${color.magenta('████')}${color.cyan('████')}${color.magenta('████')}`,
          ].join('\n'),
        );
      },
    );
  },
  {
    fps: 8,
    keyboard: true,
    mouse: true,
    alternateBuffer: true,
    hideCursor: true,
  },
);
