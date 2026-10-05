/**
 * Bunti Node.js Smoke Suite
 *
 * Verifies that the compiled dist/ output functions completely in plain Node.js
 * without any Bun runtime APIs or dependencies.
 */

import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = resolve(import.meta.dirname, '..', 'dist');

console.log('Testing Node.js compatibility with Node', process.version);

// 1. Verify all package entry points and subpath exports can be imported
console.log('1. Importing subpath entry points...');
const [
  main,
  components,
  geometry,
  icons,
  iconsFull,
  layout,
  renderMod,
  themes,
] = await Promise.all([
  import(pathToFileURL(resolve(distDir, 'index.js')).href),
  import(pathToFileURL(resolve(distDir, 'components/index.js')).href),
  import(pathToFileURL(resolve(distDir, 'geometry.js')).href),
  import(pathToFileURL(resolve(distDir, 'icons.js')).href),
  import(pathToFileURL(resolve(distDir, 'icons-full.js')).href),
  import(pathToFileURL(resolve(distDir, 'layout.js')).href),
  import(pathToFileURL(resolve(distDir, 'render.js')).href),
  import(pathToFileURL(resolve(distDir, 'themes/index.js')).href),
]);

assert.ok(main.render, 'main.render should be defined');
assert.ok(main.bunti, 'main.bunti namespace should be defined');
assert.ok(components.Box, 'components.Box should be defined');
assert.ok(geometry.splitRect, 'geometry.splitRect should be defined');
assert.ok(icons.icon, 'icons.icon should be defined');
assert.ok(iconsFull.NF_GLYPHS, 'iconsFull.NF_GLYPHS should be defined');
assert.ok(layout.box, 'layout.box should be defined');
assert.ok(renderMod.flush, 'renderMod.flush should be defined');
assert.ok(themes.nord, 'themes.nord should be defined');
console.log('   All 8 subpaths imported successfully.');

// 2. String width fallback in plain Node
console.log('2. Verifying unicode string measurement...');
assert.strictEqual(main.visibleWidth('hello'), 5);
assert.strictEqual(main.visibleWidth('\x1b[32mhello\x1b[0m'), 5);
assert.strictEqual(main.visibleWidth('🍭'), 2);
assert.strictEqual(main.visibleWidth('你好世界'), 8);
assert.strictEqual(main.visibleWidth('👨‍👩‍👧‍👦'), 2);
assert.strictEqual(main.visibleWidth('\uf067'), 1); // Nerd font glyph in PUA
assert.strictEqual(main.charWidth('🍭'), 2);
assert.strictEqual(main.charWidth('A'), 1);
assert.strictEqual(main.visibleWidth(main.truncate('hello world', 5)), 5);
assert.strictEqual(main.stripAnsi(main.truncate('hello world', 5)), 'hell…');
console.log('   String measurement passed.');

// 3. Headless screen context & layout
console.log('3. Testing headless screen context and box layout...');
const state = main.createScreenState();
const ctx = main.createScreenContext(state);
ctx.box({ width: 20, height: 5, border: 'rounded' }, (sub) => {
  sub.text('node-test');
});
assert.ok(state.backBuffer.length > 0, 'Back buffer should have cells');
console.log('   Screen context layout passed.');

// 4. One-shot render loop
console.log('4. Testing render() with once: true...');
let renderCallbackCalled = false;
await main.render(
  (c) => {
    renderCallbackCalled = true;
    c.box({ width: 10, height: 3 }, (s) => s.text('hi'));
  },
  { once: true },
);
assert.strictEqual(renderCallbackCalled, true, 'Render callback must be invoked');
console.log('   One-shot render loop passed.');

// 5. CLI commands
console.log('5. Testing CLI execution via Node...');
const cliPath = resolve(distDir, 'cli.js');

const versionOut = execFileSync(process.execPath, [cliPath, '--version'], {
  encoding: 'utf-8',
}).trim();
assert.ok(versionOut.length > 0, 'CLI --version should produce output');

const doctorOut = execFileSync(process.execPath, [cliPath, 'doctor'], {
  encoding: 'utf-8',
});
assert.ok(doctorOut.includes('node'), 'CLI doctor should report node runtime');
assert.ok(doctorOut.includes('colors'), 'CLI doctor should report colors');

const demosOut = execFileSync(process.execPath, [cliPath, 'demo'], {
  encoding: 'utf-8',
});
assert.ok(demosOut.includes('mission-control'), 'CLI list-demos should list mission-control');

// 6. Demo execution under Node
console.log('6. Testing demo execution under Node (showcase --once)...');
const demoOut = execFileSync(
  process.execPath,
  [cliPath, 'demo', 'showcase', '--once'],
  { encoding: 'utf-8', env: { ...process.env, BUNTI_NO_HINTS: '1' } },
);
assert.ok(demoOut.length > 0, 'Demo should produce output');
console.log('   Demo execution passed.');

console.log('\nAll Node.js smoke tests passed successfully!');
