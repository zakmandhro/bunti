import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Cross-platform `rm -rf dist` for the build script.
rmSync(resolve(import.meta.dir, '..', 'dist'), {
  recursive: true,
  force: true,
});
