/**
 * Bunti Full Nerd Fonts Icon Pack (~10.7k glyphs, NF v3.4.0)
 *
 * Agent-obvious usage — one side-effect import anywhere in your app:
 *
 *   import '@zakmandhro/bunti/icons-full';
 *
 * That single line installs every Nerd Fonts glyph into Bunti's runtime
 * icon registry, so `icon('fa-rocket')`, `icon('md-robot')`, or the
 * prefixed form `icon('nf-fa-rocket')` all resolve by name. The curated
 * short names ('rocket', 'branch', ...) keep working and keep priority.
 *
 * Prefer an explicit call site? `installFullIcons()` is exported too and
 * is idempotent — importing this module already invokes it once.
 *
 * This is a separate subpath export on purpose: the core
 * '@zakmandhro/bunti' entry never loads the ~280KB glyph map.
 */
import { NF_GLYPHS } from './data/nf-glyphs';
import { registerAll } from './icons';

export { NF_GLYPHS, NF_VERSION } from './data/nf-glyphs';
export type { IconName } from './data/nf-names';

let installed = false;

/** Installs the full Nerd Fonts map into the runtime registry (idempotent). */
export function installFullIcons(): void {
  if (installed) return;
  installed = true;
  registerAll(NF_GLYPHS);
}

installFullIcons();
