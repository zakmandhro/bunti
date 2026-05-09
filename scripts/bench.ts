import { box, joinHorizontal, joinVertical, render, createStyle, truncate } from '../src/index';
import pc from 'picocolors';

/**
 * Bunti Performance Benchmark
 * Renders a high-complexity dashboard frame 1000 times.
 */

const panel = createStyle({
  border: 'rounded',
  borderColor: pc.cyan,
  padding: [1, 2],
  width: 50
});

const header = createStyle({
  align: 'center',
  borderColor: pc.magenta,
  border: 'normal',
  padding: [0, 1],
  width: 102
});

const mockItems = Array.from({ length: 10 }).map((_, i) => `Mission Control Log Entry #${i + 100}`);

console.log(pc.bold(pc.magenta("\n🚀 Initiating Bunti Performance Benchmark...")));
console.log(pc.dim("Rendering 1000 complex frames...\n"));

const start = performance.now();

for (let i = 0; i < 1000; i++) {
  const frame = joinVertical(
    header(pc.bold("\u{F086F}  BUNTI ENGINE CORE :: 1000 FRAME STRESS TEST")),
    joinHorizontal(
      panel(pc.blue("CORE TELEMETRY\n") + `LATENCY: ${(Math.random() * 0.5).toFixed(3)}ms\nTHROUGHPUT: ${(Math.random() * 1000).toFixed(0)} f/s`),
      panel(pc.yellow("ACTIVE SUB-SYSTEMS\n") + mockItems.slice(0, 3).map(it => truncate(it, 40)).join('\n'))
    )
  );

  if (i === 999) render(frame);
}

const end = performance.now();
const total = end - start;
const perFrame = total / 1000;

console.log(pc.green("\n🏁 Benchmark Complete!"));
console.log(`Total Time: ${pc.bold(total.toFixed(2))}ms`);
console.log(`Avg Per Frame: ${pc.bold(perFrame.toFixed(4))}ms`);
console.log(`Est. Throughput: ${pc.bold(Math.round(1000 / (total / 1000)))} frames/sec`);
