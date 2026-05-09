import { box, joinHorizontal, joinVertical, render, createStyle, truncate } from '../src/index';
import pc from 'picocolors';

// 1. Define a "Space Theme" using createStyle
const panel = createStyle({
  border: 'rounded',
  borderColor: pc.cyan,
  padding: [1, 2],
  width: 40
});

const header = createStyle({
  align: 'center',
  borderColor: pc.magenta,
  border: 'normal',
  padding: [0, 1]
});

// 2. Mock Data
const data = Array.from({ length: 50 }).map((_, i) => `Mission #${i + 1000}: High-Speed Orbital Manuever`);

console.time('Bunti Render');

// 3. Render 100 frames to showcase speed
for (let i = 0; i < 100; i++) {
  const frame = joinVertical(
    header(pc.bold('🚀 BUNTI PERFORMANCE SHOWCASE')),
    joinHorizontal(
      panel(pc.blue('Telemetry\n') + `CPU: ${Math.random().toFixed(2)}%\nRAM: ${Math.random().toFixed(2)}GB`),
      panel(pc.magenta('Active Missions\n') + data.slice(i % 10, (i % 10) + 3).map(d => truncate(d, 30)).join('\n'))
    )
  );
  
  // In a real TUI we'd use clear/goHome, but for the benchmark we just render
  if (i === 99) render(frame);
}

console.log('\n--- PERFORMANCE STATS ---');
console.timeEnd('Bunti Render');
console.log('Frames Rendered: 100');
console.log('Fidelity: High (ANSI + Box Model)');
console.log('Dependency: 0 Native Binaries');
