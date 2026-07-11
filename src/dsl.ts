/**
 * Bunti High-Level Contextual DSL
 * Scoped closure API with contextual capabilities via trait-based composition.
 *
 * Implementation lives in src/dsl/ — this barrel preserves the public surface:
 * - context: createDSLContext + box rendering + createScreenContext
 * - render: the render() entry point
 * - hooks: useState / useAsync / usePersistentState
 * - interaction: hitbox / hover / press / click + focus management
 * - layers: transparent buffers + compositing
 * - motion: animate / typewriter / flicker / fade
 * - types: shared interfaces + KEYS
 */

export { createScreenContext } from './dsl/context';
export { render } from './dsl/render';
export type {
  BuntiContext,
  DSLBoxOptions,
  LayerOptions,
  TypewriterOptions,
  TypewriterState,
} from './dsl/types';
export { KEYS } from './dsl/types';
