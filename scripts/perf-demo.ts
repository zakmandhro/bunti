import { bunti } from '../src/index';
import pc from 'picocolors';

/**
 * Bunti Performance Demo - RESTORED STABLE
 */

const panel = bunti.createStyle({
  border: 'rounded',
  borderColor: pc.cyan,
  padding: [1, 2],
  width: 50
});

const header = bunti.createStyle({
  align: 'center',
  borderColor: pc.magenta,
  border: 'normal',
  padding: [0, 1],
  width: 102
});

const bar = (val: number, max: number, width: number) => {
  const filled = Math.round((val / max) * width);
  return pc.green('█'.repeat(filled)) + pc.dim('░'.repeat(width - filled));
};

const runDemo = async () => {
  console.log(bunti.ANSI.clear + bunti.ANSI.hideCursor);

  let frames = 0;
  const start = performance.now();

  const items = [
    "Propulsion System Online",
    "Life Support Nominal",
    "Navigation Synced with Earth",
    "AI Agent 'Claude' Active",
    "Solar Array Deployment: 85%",
    "Cabin Pressure Stable",
    "Blackbox Logging Active"
  ];

  for (let i = 0; i < 200; i++) {
    const now = performance.now();
    const elapsed = (now - start) / 1000;
    const fps = Math.round(frames / elapsed) || 0;
    
    const cpu = Math.abs(Math.sin(i / 10)) * 100;
    const ram = 1.2 + Math.cos(i / 15) * 0.5;

    const frame = bunti.joinVertical(
      header(pc.bold("BUNTI (BUN TERMINAL INTERFACE) PERFORMANCE DEMO")),
      bunti.joinHorizontal(
        panel(
          pc.blue("CORE TELEMETRY\n") + 
          `FPS: ${fps} f/s\n` +
          `CPU: ${bar(cpu, 100, 20)} ${cpu.toFixed(1)}%\n` +
          `RAM: ${bar(ram, 4, 20)} ${ram.toFixed(2)}GB`
        ),
        panel(
          pc.yellow("MISSION LOG\n") + 
          items.slice(i % 4, (i % 4) + 3).map(it => bunti.truncate(it, 40)).join('\n')
        )
      ),
      bunti.box(pc.dim(`Time Elapsed: ${elapsed.toFixed(2)}s | Total Frames: ${frames}`), { width: 102, align: 'center' })
    );

    bunti.render(frame, { home: true });
    frames++;
    
    await new Promise(r => setTimeout(r, 16)); 
  }

  process.stdout.write(bunti.ANSI.showCursor);
  console.log(pc.green("\n🏁 Performance Demo Restored."));
};

runDemo();
