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

function fractalGlassColor(nx: number, ny: number, phase: number): RGB {
  let color: RGB = { r: 4, g: 10, b: 28 };
  const drift = Math.sin(phase * Math.PI * 2) * 0.018;

  color = addGlow(
    color,
    { r: 0, g: 166, b: 190 },
    0.88,
    0.08 + drift,
    0.18,
    nx,
    ny,
    0.36,
    0.56,
  );
  color = addGlow(
    color,
    { r: 236, g: 0, b: 126 },
    0.92,
    0.42 - drift,
    0.38,
    nx,
    ny,
    0.32,
    0.5,
  );
  color = addGlow(
    color,
    { r: 255, g: 135, b: 52 },
    0.95,
    0.72 + drift,
    0.7,
    nx,
    ny,
    0.28,
    0.48,
  );
  color = addGlow(
    color,
    { r: 242, g: 234, b: 190 },
    0.65,
    0.88,
    0.88,
    nx,
    ny,
    0.16,
    0.26,
  );
  color = addGlow(
    color,
    { r: 0, g: 196, b: 220 },
    0.52,
    0.93,
    0.2,
    nx,
    ny,
    0.08,
    0.42,
  );

  const vignette =
    0.28 +
    0.72 *
      clamp01(1 - Math.hypot((nx - 0.54) / 0.86, (ny - 0.52) / 0.9) * 0.72);

  return {
    r: Math.round(color.r * vignette),
    g: Math.round(color.g * vignette),
    b: Math.round(color.b * vignette),
  };
}

function drawEngineField(state: ScreenState, width: number, height: number) {
  const phase = 0.34;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      const slat = x % 4;
      const seam = slat === 0 ? 0.42 : slat === 1 ? 0.12 : 0;
      const prism =
        Math.sin((nx * 18 + ny * 4 + phase * 3) * Math.PI) * 0.08 +
        Math.cos((nx * 5 - ny * 9 - phase * 2) * Math.PI) * 0.06;
      const glassShade = clamp01(0.13 + seam - prism);
      const highlight =
        slat === 3 && Math.sin((ny * 3.4 + nx * 1.8 + phase) * Math.PI) > 0.18
          ? 0.2
          : 0;
      const gradientColor = mix(
        mix(
          fractalGlassColor(nx, ny, phase),
          { r: 1, g: 4, b: 18 },
          glassShade,
        ),
        { r: 220, g: 245, b: 255 },
        highlight,
      );
      setCell(state, x, y, {
        char: '█',
        fg: gradientColor,
        bg: gradientColor,
      });
    }
  }
}

function metric(label: string, value: string, color: (s: string) => string) {
  return `${label.padEnd(13)} ${color(value)}`;
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
    const shell = innerRect({ x: 0, y: 0, width, height }, 2);
    const compact = width < 92;
    const title = ' 🍭  BUNTI RENDER ENGINE ';
    const titleArea = resolveLocalRect({
      y: 1,
      width: Math.min(width - 4, visibleWidth(title) + 10),
      height: 1,
    });

    box(
      {
        x: titleArea.x,
        y: titleArea.y,
        width: titleArea.width,
        height: titleArea.height,
        border: 'none',
        bgColor: { r: 24, g: 24, b: 30 },
        align: 'center',
      },
      ({ text }) => text(color.bold(color.white(title))),
    );

    const stage = innerRect(shell, {
      top: Math.min(6, Math.max(3, Math.floor(height * 0.12))),
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
        bgColor: { r: 12, g: 14, b: 18 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(
          [
            color.cyan('CORE TELEMETRY'),
            '',
            metric('TICK', frame.toString().padStart(6, '0'), color.yellow),
            metric('RESOLUTION', `${width}x${height}`, color.green),
            metric('MOUSE', `${mouseX},${mouseY}`, color.magenta),
            metric(
              'MODE',
              compact ? 'STACKED RECTS' : 'SPLIT RECTS',
              color.cyan,
            ),
            '',
            `${color.gray('q')} quits  ${color.gray('resize')} reflows  ${color.gray('mouse')} lights hitboxes`,
          ].join('\n'),
        );
      },
    );

    const clippingText =
      'This panel proves ANSI-aware clipping and wrapping. The same sentence can fold inside one Rect while the neighbor truncates sharply at its boundary without escape-sequence damage.';
    box(
      {
        x: clipping!.x,
        y: clipping!.y,
        width: clipping!.width,
        height: clipping!.height,
        border: 'none',
        bgColor: { r: 15, g: 15, b: 18 },
        padding: [1, 2],
        wrap: true,
      },
      ({ text }) => {
        text(`${color.yellow('CLIPPING + WRAP')}\n\n`);
        text(`${color.bold('WRAPPED')}\n${clippingText}\n\n`);
        text(`${color.bold('TRUNCATED')}\n`);
        text(color.fg({ r: 160, g: 160, b: 170 }, clippingText.repeat(2)));
      },
    );

    box(
      {
        x: hitTargets!.x,
        y: hitTargets!.y,
        width: hitTargets!.width,
        height: hitTargets!.height,
        border: 'none',
        bgColor: { r: 10, g: 14, b: 12 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(`${color.green('HITBOX MAP')}\n\n`);
        text(`${color.gray('Move the mouse over the bars.')}\n\n`);
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
        bgColor: { r: 16, g: 12, b: 22 },
        padding: [1, 2],
      },
      ({ text }) => {
        text(
          [
            color.magenta('COLOR ISOLATION'),
            '',
            `${color.bgBlue(color.white(' nested bg '))} ${color.red('red')} ${color.green('green')} ${color.yellow('yellow')}`,
            `${color.fg({ r: 190, g: 200, b: 215 }, 'ANSI resets stay contained inside composed rows.')}`,
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
