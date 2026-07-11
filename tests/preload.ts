/**
 * Test preload: pins ANSI color output ON before any module is imported.
 *
 * The vendored colors module computes `isColorSupported` once at import time
 * from the environment (TTY / FORCE_COLOR / CI). Under `bun test` that varies
 * by host (piped stdout disables it), which would make styled-string
 * assertions environment-dependent. Forcing color here keeps the suite
 * deterministic everywhere — the same spirit as setColorTier('truecolor')
 * in the test files.
 */

process.env.FORCE_COLOR = '1';

/**
 * Dev hints (src/diagnostics.ts) stay quiet during the suite: hundreds of
 * tests legitimately read ctx.keys or paint overlapping boxes without
 * enabling input, and their buffered hints would spam stderr after the
 * test summary. Diagnostics tests re-enable hints per-test by setting
 * BUNTI_NO_HINTS='0' (the flag is read at record time, not import time).
 */
process.env.BUNTI_NO_HINTS = '1';
