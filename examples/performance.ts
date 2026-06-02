import { bunti } from '../src/index';

/**
 * Bunti Performance Benchmark
 * Renders 100 complex frames as fast as possible.
 */

const runBenchmark = async () => {
  console.log('--- STARTING PERFORMANCE BENCHMARK ---');
  console.time('Bunti Benchmark');

  // We'll use the low-level API directly to avoid loop overhead and exit conditions
  const state = bunti.createScreenState({ alternateBuffer: false });

  for (let i = 0; i < 100; i++) {
    bunti.clearBackBuffer(state);

    // Complex Scene
    bunti.gradient(state, ['#0000ff', '#ff0000'], { direction: 'vertical' });

    const ui = bunti.box(`FRAME: ${i}\nBURST: NOMINAL`, {
      border: 'rounded',
      padding: [1, 2],
      align: 'center',
    });

    const w = 20,
      h = 4;
    const x = Math.floor((state.width - w) / 2);
    const y = Math.floor((state.height - h) / 2);

    bunti.rect(state, x, y, w, h, { char: ' ', bg: 234 });
    bunti.blit(state, x, y, ui);

    bunti.flush(state);
  }

  console.timeEnd('Bunti Benchmark');
  console.log('Frames Rendered: 100');
  console.log('Fidelity: High (Double-Buffered Diffing)');
  console.log('Strategy: Surgical Row Diffing');
};

runBenchmark();
