/**
 * The public demo registry — the single source of truth for every demo that
 * ships in the npm package and appears in `bunti demo`, `bun run demo`, and
 * the smoke suite.
 *
 * Demo sources live in demo/ during development; `bun run build` copies them
 * (with imports rewritten to dist-relative paths) into dist/demos/ so the
 * published package can run them via `bunx @zakmandhro/bunti demo <name>`.
 */

export interface DemoEntry {
  /** Registry name, as typed after `bunti demo`. */
  name: string;
  /** Source file name inside demo/ (and dist/demos/ after build). */
  file: string;
  /** One-line description for `bunti demo` listings. */
  description: string;
}

/** Public demos, in listing order. */
export const PUBLIC_DEMOS: DemoEntry[] = [
  {
    name: 'mission-control',
    file: 'mission-control.ts',
    description:
      'Agent fleet dashboard - 8 live themes, sparklines, activity feed',
  },
  {
    name: '2048',
    file: '2048.ts',
    description: 'The classic game - keyboard input, merge animations',
  },
  {
    name: 'animation',
    file: 'animation.ts',
    description: 'Motion engine tour - easings, stagger, transitions',
  },
  {
    name: 'interaction',
    file: 'interaction.ts',
    description: 'Mouse + focus playground - buttons, inputs, hitboxes',
  },
  {
    name: 'login',
    file: 'login.ts',
    description: 'Login form - pointer cursor, links, progress',
  },
  {
    name: 'engine',
    file: 'engine.ts',
    description: 'Raw render loop - diff renderer under the hood',
  },
  {
    name: 'showcase',
    file: 'showcase.ts',
    description: 'Kitchen sink - colors, borders, gradients, icons, tables',
  },
];

/**
 * Non-demo helper modules that public demos import; copied alongside them
 * into dist/demos/ by scripts/build-demos.ts.
 */
export const DEMO_HELPERS = ['demo-layout.ts'];

/** Looks up a public demo by registry name. */
export function findDemo(name: string): DemoEntry | undefined {
  return PUBLIC_DEMOS.find((d) => d.name === name);
}
