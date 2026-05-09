/**
 * Bunti (Bun Terminal Interface)
 * A minimalist, utility-first TUI engine built specifically for Bun.
 */

import * as detect from './detect';
import * as icons from './icons';
import * as layout from './layout';
import * as render from './render';
import * as utils from './utils';

// Individual exports for surgical imports
export * from './detect';
export * from './icons';
export * from './layout';
export * from './render';
export * from './utils';

// Namespaced export for bunti.icon() style usage
export const bunti = {
  ...detect,
  ...icons,
  ...layout,
  ...render,
  ...utils,
};

export default bunti;
