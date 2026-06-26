import { Box, Card, Modal } from '../src/components';
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  visibleWidth,
} from '../src/index';
import type { RGB } from '../src/state';
import { demo } from './demo-layout';

// --- Game Types ---
type Grid = number[][];

// --- Core 2048 Logic Helpers ---

function initGame(): Grid {
  const grid = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  spawnTile(grid);
  spawnTile(grid);
  return grid;
}

function spawnTile(grid: Grid) {
  const empties: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r]![c] === 0) {
        empties.push({ r, c });
      }
    }
  }
  if (empties.length > 0) {
    const { r, c } = empties[Math.floor(Math.random() * empties.length)]!;
    grid[r]![c] = Math.random() < 0.9 ? 2 : 4;
  }
}

function transpose(grid: Grid): Grid {
  const result = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      result[c]![r] = grid[r]![c]!;
    }
  }
  return result;
}

interface TileMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  value: number;
  merged: boolean;
}

interface PeakMergeCelebration {
  row: number;
  col: number;
  value: number;
  startedAt: number;
}

function moveRowLeft(row: number[]): {
  newRow: number[];
  moves: { from: number; to: number; merged: boolean; val: number }[];
  score: number;
} {
  const newRow = [0, 0, 0, 0];
  const moves: { from: number; to: number; merged: boolean; val: number }[] =
    [];
  const mergedInThisTurn = [false, false, false, false];
  let writeCol = 0;
  let score = 0;

  for (let col = 0; col < 4; col++) {
    const val = row[col]!;
    if (val === 0) continue;

    if (
      writeCol > 0 &&
      newRow[writeCol - 1] === val &&
      !mergedInThisTurn[writeCol - 1]
    ) {
      newRow[writeCol - 1] = val * 2;
      score += val * 2;
      mergedInThisTurn[writeCol - 1] = true;

      // Update the previous moves that wrote to writeCol - 1 to reflect the merge
      for (const m of moves) {
        if (m.to === writeCol - 1) {
          m.merged = true;
        }
      }

      moves.push({ from: col, to: writeCol - 1, merged: true, val });
    } else {
      newRow[writeCol] = val;
      moves.push({ from: col, to: writeCol, merged: false, val });
      writeCol++;
    }
  }

  return { newRow, moves, score };
}

function slideLeft(grid: Grid): {
  next: Grid;
  scoreGained: number;
  moves: TileMove[];
} {
  const next: Grid = [];
  let scoreGained = 0;
  const moves: TileMove[] = [];

  for (let r = 0; r < 4; r++) {
    const { newRow, moves: rowMoves, score } = moveRowLeft(grid[r]!);
    next.push(newRow);
    scoreGained += score;

    for (const rm of rowMoves) {
      moves.push({
        fromRow: r,
        fromCol: rm.from,
        toRow: r,
        toCol: rm.to,
        value: rm.val,
        merged: rm.merged,
      });
    }
  }

  return { next, scoreGained, moves };
}

function slideRight(grid: Grid): {
  next: Grid;
  scoreGained: number;
  moves: TileMove[];
} {
  const next: Grid = [];
  let scoreGained = 0;
  const moves: TileMove[] = [];

  for (let r = 0; r < 4; r++) {
    const reversed = [...grid[r]!].reverse();
    const { newRow, moves: rowMoves, score } = moveRowLeft(reversed);
    next.push([...newRow].reverse());
    scoreGained += score;

    for (const rm of rowMoves) {
      const fromCol = 3 - rm.from;
      const toCol = 3 - rm.to;
      moves.push({
        fromRow: r,
        fromCol,
        toRow: r,
        toCol,
        value: rm.val,
        merged: rm.merged,
      });
    }
  }

  return { next, scoreGained, moves };
}

function slideUp(grid: Grid): {
  next: Grid;
  scoreGained: number;
  moves: TileMove[];
} {
  const transposed = transpose(grid);
  const { next: slid, scoreGained, moves: slidMoves } = slideLeft(transposed);
  const moves = slidMoves.map((m) => ({
    fromRow: m.fromCol,
    fromCol: m.fromRow,
    toRow: m.toCol,
    toCol: m.toRow,
    value: m.value,
    merged: m.merged,
  }));
  return { next: transpose(slid), scoreGained, moves };
}

function slideDown(grid: Grid): {
  next: Grid;
  scoreGained: number;
  moves: TileMove[];
} {
  const transposed = transpose(grid);
  const { next: slid, scoreGained, moves: slidMoves } = slideRight(transposed);
  const moves = slidMoves.map((m) => ({
    fromRow: m.fromCol,
    fromCol: m.fromRow,
    toRow: m.toCol,
    toCol: m.toRow,
    value: m.value,
    merged: m.merged,
  }));
  return { next: transpose(slid), scoreGained, moves };
}

function gridChanged(g1: Grid, g2: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (g1[r]![c] !== g2[r]![c]) return true;
    }
  }
  return false;
}

function getMaxTile(grid: Grid): number {
  let max = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      max = Math.max(max, grid[r]![c]!);
    }
  }
  return max;
}

function findPeakMerge(
  moves: TileMove[],
  next: Grid,
  currentMaxTile: number,
): Omit<PeakMergeCelebration, 'startedAt'> | null {
  let peak: Omit<PeakMergeCelebration, 'startedAt'> | null = null;
  const seenTargets = new Set<string>();

  for (const move of moves) {
    if (!move.merged) continue;

    const key = `${move.toRow}:${move.toCol}`;
    if (seenTargets.has(key)) continue;
    seenTargets.add(key);

    const value = next[move.toRow]![move.toCol]!;
    if (value <= currentMaxTile) continue;
    if (peak && value <= peak.value) continue;

    peak = {
      row: move.toRow,
      col: move.toCol,
      value,
    };
  }

  return peak;
}

function isGameOver(grid: Grid): boolean {
  // Any empty cells left?
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r]![c] === 0) return false;
    }
  }
  // Any adjacent equal values horizontally?
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[r]![c] === grid[r]![c + 1]) return false;
    }
  }
  // Any adjacent equal values vertically?
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r]![c] === grid[r + 1]![c]) return false;
    }
  }
  return true;
}

// --- Text Centering Helper ---
function centerText(text: string, width: number): string {
  const padTotal = width - text.length;
  if (padTotal <= 0) return text.substring(0, width);
  const padLeft = Math.floor(padTotal / 2);
  const padRight = padTotal - padLeft;
  return ' '.repeat(padLeft) + text + ' '.repeat(padRight);
}

function mixRGB(from: RGB, to: RGB, amount: number): RGB {
  const t = clamp01(amount);
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
  };
}

// --- Tile Theme Colors (Original 2048 palette) ---
interface TileColors {
  bg: RGB;
  fg: RGB;
}

function getTileColors(val: number): TileColors {
  switch (val) {
    case 2:
      return { bg: { r: 238, g: 228, b: 218 }, fg: { r: 119, g: 110, b: 101 } };
    case 4:
      return { bg: { r: 237, g: 224, b: 200 }, fg: { r: 119, g: 110, b: 101 } };
    case 8:
      return { bg: { r: 242, g: 177, b: 121 }, fg: { r: 249, g: 246, b: 242 } };
    case 16:
      return { bg: { r: 245, g: 149, b: 99 }, fg: { r: 249, g: 246, b: 242 } };
    case 32:
      return { bg: { r: 246, g: 124, b: 95 }, fg: { r: 249, g: 246, b: 242 } };
    case 64:
      return { bg: { r: 246, g: 94, b: 59 }, fg: { r: 249, g: 246, b: 242 } };
    case 128:
      return { bg: { r: 237, g: 207, b: 114 }, fg: { r: 249, g: 246, b: 242 } };
    case 256:
      return { bg: { r: 237, g: 204, b: 97 }, fg: { r: 249, g: 246, b: 242 } };
    case 512:
      return { bg: { r: 156, g: 206, b: 56 }, fg: { r: 249, g: 246, b: 242 } };
    case 1024:
      return { bg: { r: 70, g: 180, b: 233 }, fg: { r: 249, g: 246, b: 242 } };
    case 2048:
      return { bg: { r: 164, g: 75, b: 227 }, fg: { r: 249, g: 246, b: 242 } };
    default:
      if (val > 2048) {
        return {
          bg: { r: 224, g: 36, b: 171 },
          fg: { r: 255, g: 255, b: 255 },
        };
      }
      // Empty grid cell background (dark slate)
      return { bg: { r: 44, g: 47, b: 56 }, fg: { r: 80, g: 85, b: 95 } };
  }
}

const SLIDE_ANIMATION_DURATION = 220;
const PEAK_MERGE_DURATION = 380;
const GRID_SIZE = 4;
const TILE_W = 8;
const TILE_H = 3;
const TILE_GAP_X = 2;
const TILE_GAP_Y = 1;
const TILE_STEP_X = TILE_W + TILE_GAP_X;
const TILE_STEP_Y = TILE_H + TILE_GAP_Y;
const BOARD_W = GRID_SIZE * TILE_W + (GRID_SIZE - 1) * TILE_GAP_X + 2;
const BOARD_H = GRID_SIZE * TILE_H + (GRID_SIZE - 1) * TILE_GAP_Y + 2;

function drawPeakMergeCelebration(
  ctx: Parameters<Parameters<typeof Box>[2]>[0],
  celebration: PeakMergeCelebration | null,
) {
  if (!celebration) return;

  const age = Date.now() - celebration.startedAt;
  if (age < 0 || age > PEAK_MERGE_DURATION) return;

  const progress = clamp01(age / PEAK_MERGE_DURATION);
  const glow = 1 - easeOutCubic(progress);
  const flash = Math.sin(progress * Math.PI) * (1 - progress * 0.35);
  const tileX = ctx.offsetX + 1 + celebration.col * TILE_STEP_X;
  const tileY = ctx.offsetY + 1 + celebration.row * TILE_STEP_Y;
  const { bg: tileBg, fg: tileFg } = getTileColors(celebration.value);
  const glowColor = mixRGB(
    { r: 62, g: 52, b: 30 },
    { r: 255, g: 226, b: 86 },
    glow,
  );
  const numberColor = mixRGB(tileFg, { r: 255, g: 255, b: 255 }, flash);
  const tileColor = mixRGB(tileBg, { r: 255, g: 226, b: 86 }, flash * 0.22);

  ctx.layer(8, (fx) => {
    fx.rect(tileX - 1, tileY - 1, TILE_W + 2, TILE_H + 2, { bg: glowColor });

    fx.rect(tileX, tileY, TILE_W, TILE_H, { bg: tileColor });
    fx.blit(
      tileX,
      tileY + 1,
      fx.color.bold(centerText(celebration.value.toString(), TILE_W)),
      {
        fg: numberColor,
        bg: tileColor,
        bold: true,
      },
    );
  });
}

// --- Main 2048 Demo ---

demo(
  'Bunti Retro Arcade: 2048',
  (ctx, bounds) => {
    const {
      color,
      gradient,
      lastKey,
      usePersistentState,
      useState,
      wallpaper,
    } = ctx;

    // --- State Initialization ---
    const [grid, setGrid] = useState<Grid | null>('2048_grid', null);
    const [score, setScore] = useState<number>('2048_score', 0);
    const [highScore, setHighScore] = usePersistentState<number>(
      '2048_highscore',
      0,
    );
    const [gameOver, setGameOver] = useState<boolean>('2048_gameover', false);
    const [win, setWin] = useState<boolean>('2048_win', false);
    const [keepPlaying, setKeepPlaying] = useState<boolean>(
      '2048_keepplaying',
      false,
    );
    const [activeMoves, setActiveMoves] = useState<TileMove[]>(
      '2048_activemoves',
      [],
    );
    const [slideStart, setSlideStart] = useState<number>('2048_slidestart', 0);
    const [maxTile, setMaxTile] = useState<number>('2048_maxtile', 0);
    const [peakMerge, setPeakMerge] = useState<PeakMergeCelebration | null>(
      '2048_peakmerge',
      null,
    );

    const resetGame = () => {
      const g = initGame();
      setGrid(g);
      setScore(0);
      setGameOver(false);
      setWin(false);
      setKeepPlaying(false);
      setActiveMoves([]);
      setSlideStart(0);
      setMaxTile(getMaxTile(g));
      setPeakMerge(null);
    };

    if (grid === null) {
      resetGame();
      return;
    }

    // --- Process Input Events ---
    if (lastKey) {
      let moved = false;
      let next: Grid = [];
      let scoreGained = 0;
      let computedMoves: TileMove[] = [];

      if (win && !keepPlaying) {
        if (lastKey === 'enter' || lastKey === 'c') {
          setKeepPlaying(true);
          setWin(false);
        }
      } else if (!gameOver) {
        if (lastKey === 'up' || lastKey === 'w') {
          const res = slideUp(grid);
          next = res.next;
          scoreGained = res.scoreGained;
          computedMoves = res.moves;
          moved = gridChanged(grid, next);
        } else if (lastKey === 'down' || lastKey === 's') {
          const res = slideDown(grid);
          next = res.next;
          scoreGained = res.scoreGained;
          computedMoves = res.moves;
          moved = gridChanged(grid, next);
        } else if (lastKey === 'left' || lastKey === 'a') {
          const res = slideLeft(grid);
          next = res.next;
          scoreGained = res.scoreGained;
          computedMoves = res.moves;
          moved = gridChanged(grid, next);
        } else if (lastKey === 'right' || lastKey === 'd') {
          const res = slideRight(grid);
          next = res.next;
          scoreGained = res.scoreGained;
          computedMoves = res.moves;
          moved = gridChanged(grid, next);
        }

        if (moved) {
          const now = Date.now();
          const peak = findPeakMerge(computedMoves, next, maxTile);

          setActiveMoves(computedMoves);
          setSlideStart(now);

          spawnTile(next);
          setGrid(next);
          setMaxTile(Math.max(maxTile, getMaxTile(next)));
          if (peak) {
            setPeakMerge({
              ...peak,
              startedAt: now + SLIDE_ANIMATION_DURATION,
            });
          }
          const newScore = score + scoreGained;
          setScore(newScore);

          if (newScore > highScore) {
            setHighScore(newScore);
          }

          // Check if user hit 2048
          if (!win && !keepPlaying) {
            for (let r = 0; r < 4; r++) {
              for (let c = 0; c < 4; c++) {
                if (next[r]![c] === 2048) {
                  setWin(true);
                }
              }
            }
          }

          // Check for Game Over
          if (isGameOver(next)) {
            setGameOver(true);
          }
        }
      }

      if (lastKey === 'r') {
        resetGame();
      }
    }

    // --- Draw UI ---
    wallpaper(
      gradient({
        colors: [
          { r: 7, g: 10, b: 18 },
          { r: 15, g: 28, b: 46 },
          { r: 33, g: 15, b: 49 },
          { r: 8, g: 11, b: 20 },
        ],
        direction: 'vertical',
        steps: 24,
      }),
    );

    // Calculate layout sizing and center the game board
    const W = bounds.w;
    const H = bounds.h;
    const boardW = BOARD_W;
    const boardH = BOARD_H;
    const boardX = bounds.x + Math.max(0, Math.floor((W - boardW) / 2));

    // Calculate vertical layout based on available bounds.h to ensure y >= 0 and avoid any overlapping.
    // Scoreboard needs 3 rows, and board needs 19 rows.
    const totalNeededH = 3 + boardH;
    const extraH = Math.max(0, H - totalNeededH);
    const topPadding = Math.floor(extraH / 2);

    const scoreboardY = bounds.y + topPadding;
    const boardY = scoreboardY + 3; // Shift board down to make room for scoreboard (3 lines)

    // Header Panel: Scoreboard & Title
    Card(
      ctx,
      {
        x: boardX,
        y: scoreboardY,
        width: boardW,
        height: 3,
        border: 'none',
        padding: [0, 0],
      },
      (sub) => {
        const titleStr = color.yellow(color.bold(`  󰓓  2048  `));
        const scoreStr = color.white(
          `SCORE: ${color.green(color.bold(score.toString()))}  |  BEST: ${color.yellow(color.bold(highScore.toString()))}`,
        );
        const titleW = visibleWidth(titleStr);
        const scoreW = visibleWidth(scoreStr);
        const spaceCount = Math.max(0, boardW - titleW - scoreW);
        sub.text(`${titleStr}${' '.repeat(spaceCount)}${scoreStr}`);
      },
    );

    // Main 4x4 Game Grid Container
    Box(
      ctx,
      {
        x: boardX,
        y: boardY,
        width: boardW,
        height: boardH,
        border: 'none',
        padding: [0, 0],
      },
      (sub) => {
        const elapsed = Date.now() - slideStart;
        const isAnimating =
          elapsed < SLIDE_ANIMATION_DURATION && activeMoves.length > 0;

        // 1. Draw empty grid cells in background first
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const relX = 1 + c * TILE_STEP_X;
            const relY = 1 + r * TILE_STEP_Y;
            const absX = sub.offsetX + relX;
            const absY = sub.offsetY + relY;
            const { bg: bgCol } = getTileColors(0);
            sub.rect(absX, absY, TILE_W, TILE_H, { bg: bgCol });
          }
        }

        if (isAnimating) {
          const progress = clamp01(elapsed / SLIDE_ANIMATION_DURATION);
          const eased = easeInOutCubic(progress);

          for (const m of activeMoves) {
            const startX = 1 + m.fromCol * TILE_STEP_X;
            const startY = 1 + m.fromRow * TILE_STEP_Y;
            const endX = 1 + m.toCol * TILE_STEP_X;
            const endY = 1 + m.toRow * TILE_STEP_Y;

            const currX = startX + eased * (endX - startX);
            const currY = startY + eased * (endY - startY);

            const absX = Math.round(sub.offsetX + currX);
            const absY = Math.round(sub.offsetY + currY);

            const { bg: bgCol, fg: fgCol } = getTileColors(m.value);
            sub.rect(absX, absY, TILE_W, TILE_H, { bg: bgCol });
            const valStr = m.value.toString();
            const centered = color.bold(centerText(valStr, TILE_W));
            sub.blit(absX, absY + 1, centered, {
              fg: fgCol,
              bg: bgCol,
              bold: true,
            });
          }
        } else {
          // Render static tiles
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              const val = grid[r]![c]!;
              if (val === 0) continue; // Already drawn empty background

              const relX = 1 + c * TILE_STEP_X;
              const relY = 1 + r * TILE_STEP_Y;
              const absX = sub.offsetX + relX;
              const absY = sub.offsetY + relY;

              const { bg: bgCol, fg: fgCol } = getTileColors(val);

              sub.rect(absX, absY, TILE_W, TILE_H, { bg: bgCol });
              const valStr = val.toString();
              const centered = color.bold(centerText(valStr, TILE_W));
              sub.blit(absX, absY + 1, centered, {
                fg: fgCol,
                bg: bgCol,
                bold: true,
              });
            }
          }
        }

        drawPeakMergeCelebration(sub, peakMerge);

        // Overlays (Modals on top of Grid)
        if (gameOver) {
          sub.layer(10, (overlay) => {
            Modal(
              overlay,
              {
                width: 27,
                height: 7,
                border: 'none',
                bgColor: { r: 35, g: 0, b: 0 },
                align: 'center',
              },
              (modalSub) => {
                modalSub.text('\n');
                modalSub.text(color.red(color.bold('GAME OVER\n')));
                modalSub.text(color.dim(`Final Score: ${score}\n\n`));
                modalSub.text(color.yellow('[R] To Restart'));
              },
            );
          });
        } else if (win && !keepPlaying) {
          sub.layer(10, (overlay) => {
            Modal(
              overlay,
              {
                width: 27,
                height: 7,
                border: 'none',
                bgColor: { r: 35, g: 35, b: 0 },
                align: 'center',
              },
              (modalSub) => {
                modalSub.text('\n');
                modalSub.text(
                  color.fg('gold', color.bold('YOU REACHED 2048!\n')),
                );
                modalSub.text(color.dim('Magnificent job!\n\n'));
                modalSub.text(color.green('[Enter] Keep Playing'));
              },
            );
          });
        }
      },
    );

    // Bottom Control Banner
    Box(
      ctx,
      {
        x: boardX,
        y: boardY + boardH,
        width: boardW,
        height: 3,
        border: 'none',
        padding: [0, 0],
        align: 'center',
        valign: 'middle',
      },
      (sub) => {
        sub.text(
          color.dim(
            `󰜲 ${color.bold('W,A,S,D')} or ${color.bold('ARROWS')} to slide\n${color.bold('R')} restart | ${color.bold('Q')} quit`,
          ),
        );
      },
    );
  },
  {
    fps: 60,
    mouse: false, // Pure keyboard game
  },
);
