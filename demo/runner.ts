import { spawn } from "bun";

const command = process.env.npm_lifecycle_event || "demo";
const isExample = command === "example";
const target = process.argv[2];

const registry: Record<string, string> = {
  "icons": "demo/icons.ts",
  "nerd": "demo/nerd-icons.ts",
  "dashboard": "demo/dashboard.ts",
  "loop": "demo/loop-demo.ts",
  "center": "demo/center-demo.ts",
  "mouse": "demo/mouse-demo.ts",
  "color": "demo/spectrum-demo.ts",
  "box-styles": "demo/box-styles.ts",
  "gradient": "examples/gradient.ts",
  "gradient-demo": "examples/gradient-demo.ts",
  "hello": "examples/hello.ts",
  "perf": "scripts/perf-demo.ts",
  "bench": "scripts/bench.ts",
  "namespace": "scripts/namespace-demo.ts"
};

// Categorize targets based on their file path
const available = Object.keys(registry).filter(k => {
  const path = registry[k];
  if (isExample) return path.startsWith("examples/");
  return !path.startsWith("examples/");
});

if (!target || !registry[target] || (isExample && !registry[target].startsWith("examples/"))) {
  const label = isExample ? "EXAMPLE" : "DEMO";
  console.log(`\n🛰️  BUNTI ${label} RUNNER`);
  console.log(`Usage: bun ${command} <name>\n`);
  console.log(`Available ${isExample ? "Examples" : "Demos"}:`);
  available.forEach(k => console.log(`  - ${k}`));
  process.exit(1);
}

const proc = spawn(["bun", registry[target]!], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await proc.exited;
process.exit(exitCode);
