import * as detect from './detect';
import * as icons from './icons';
import * as layout from './layout';
import * as render from './render';
import * as utils from './utils';
import * as colors from './colors';
import * as state from './state';
import * as dsl from './dsl';

// Functional API
export * from './detect';
export * from './icons';
export * from './layout';
export * from './render';
export * from './utils';
export * from './colors';
export * from './state';
export * from './dsl';

// Namespaced export
export const bunti = {
  ...detect,
  ...icons,
  ...layout,
  ...render,
  ...utils,
  ...colors,
  ...state,
  ...dsl,
};

export default bunti;
