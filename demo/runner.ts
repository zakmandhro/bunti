import { spawn } from "bun";

const demo = process.argv[2];
const demos: Record<string, string> = {
  "icons": "demo/icons.ts", "dashboard": "demo/dashboard.ts",
  "perf": "scripts/perf-demo.ts",
  "bench": "scripts/bench.ts",
  "namespace": "scripts/namespace-demo.ts"
};

if (!demo || !demos[demo]) {
  console.log("\n🛰️  BUNTI DEMO RUNNER");
  console.log("Usage: bun demo <name>\n");
  console.log("Available Demos:");
  Object.keys(demos).forEach(k => console.log(`  - ${k}`));
  process.exit(1);
}

const proc = spawn(["bun", demos[demo]!], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await proc.exited;
process.exit(exitCode);
