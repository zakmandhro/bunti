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
