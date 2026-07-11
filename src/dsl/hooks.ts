/**
 * Bunti DSL state hooks: useState, useAsync, usePersistentState.
 *
 * Implementations close over the ScreenState only, so they are shared
 * unchanged by every context created for that screen.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordKeylessHook } from '../diagnostics';
import type { ScreenState } from '../state';
import type { BuntiContext } from './types';

type Hooks = Pick<BuntiContext, 'useState' | 'useAsync' | 'usePersistentState'>;

export function createHooks(state: ScreenState): Hooks {
  const hooks: Hooks = {
    useAsync<T>(
      keyOrFetcher: string | (() => Promise<T>),
      fetcherOrOptions?: (() => Promise<T>) | { interval?: number },
      maybeOptions?: { interval?: number },
    ) {
      let key: string;
      let fetcher: () => Promise<T>;
      let options: { interval?: number } | undefined;

      if (typeof keyOrFetcher === 'string') {
        key = keyOrFetcher;
        fetcher = fetcherOrOptions as () => Promise<T>;
        options = maybeOptions;
      } else {
        if (state.hookCounter === undefined) {
          state.hookCounter = 0;
        }
        const index = state.hookCounter++;
        recordKeylessHook(state, index, 'useAsync');
        key = `_async_hook_${index}`;
        fetcher = keyOrFetcher;
        options = fetcherOrOptions as { interval?: number } | undefined;
      }

      const interval = options?.interval ?? 0;
      const dataKey = `${key}_data`;
      const loadingKey = `${key}_loading`;
      const errorKey = `${key}_error`;
      const lastFetchKey = `${key}_lastFetch`;
      const fetchingKey = `${key}_fetching`;

      if (!state.componentState.has(loadingKey)) {
        state.componentState.set(loadingKey, true);
      }

      const lastFetch = state.componentState.get(lastFetchKey) as
        | number
        | undefined;
      const isFetching = state.componentState.get(fetchingKey) as boolean;
      const now = Date.now();
      const shouldFetch =
        !isFetching &&
        (lastFetch === undefined ||
          (interval > 0 && now - lastFetch >= interval));

      if (shouldFetch) {
        state.componentState.set(fetchingKey, true);
        state.componentState.set(lastFetchKey, now);
        fetcher()
          .then((result) => {
            state.componentState.set(dataKey, result);
            state.componentState.set(loadingKey, false);
            state.componentState.set(errorKey, undefined);
            (state as any).requestTick?.();
          })
          .catch((err: Error) => {
            state.componentState.set(errorKey, err);
            state.componentState.set(loadingKey, false);
            (state as any).requestTick?.();
          })
          .finally(() => {
            state.componentState.set(fetchingKey, false);
          });
      }

      return {
        data: state.componentState.get(dataKey) as T | undefined,
        loading: state.componentState.get(loadingKey) as boolean,
        error: state.componentState.get(errorKey) as Error | undefined,
      };
    },

    useState<T>(
      keyOrInitial: string | T,
      maybeInitial?: T,
    ): [T, (val: T) => void] {
      let key: string;
      let initial: T;

      if (maybeInitial === undefined) {
        if (state.hookCounter === undefined) {
          state.hookCounter = 0;
        }
        const index = state.hookCounter++;
        recordKeylessHook(state, index, 'useState');
        key = `_state_hook_${index}`;
        initial = keyOrInitial as T;
      } else {
        key = keyOrInitial as string;
        initial = maybeInitial as T;
      }

      if (!state.componentState.has(key)) {
        state.componentState.set(key, initial);
      }
      return [
        state.componentState.get(key),
        (val: T) => {
          state.componentState.set(key, val);
          (state as any).requestTick?.();
        },
      ];
    },

    usePersistentState<T>(key: string, initial: T): [T, (val: T) => void] {
      if (!state.componentState.has(key)) {
        const storeDir = join(process.cwd(), '.tmp');
        const storeFile = join(storeDir, 'bunti_store.json');
        let fileVal: any;
        try {
          if (existsSync(storeFile)) {
            const data = readFileSync(storeFile, 'utf-8');
            const parsed = JSON.parse(data);
            fileVal = parsed[key];
          }
        } catch {
          // Ignore
        }
        const finalVal = fileVal !== undefined ? fileVal : initial;
        state.componentState.set(key, finalVal);
      }

      return [
        state.componentState.get(key),
        (val: T) => {
          state.componentState.set(key, val);

          const storeDir = join(process.cwd(), '.tmp');
          const storeFile = join(storeDir, 'bunti_store.json');
          try {
            if (!existsSync(storeDir)) {
              mkdirSync(storeDir, { recursive: true });
            }
            let currentStore: Record<string, any> = {};
            if (existsSync(storeFile)) {
              try {
                currentStore = JSON.parse(readFileSync(storeFile, 'utf-8'));
              } catch {
                currentStore = {};
              }
            }
            currentStore[key] = val;
            writeFileSync(
              storeFile,
              JSON.stringify(currentStore, null, 2),
              'utf-8',
            );
          } catch {
            // Ignore
          }
          (state as any).requestTick?.();
        },
      ];
    },
  };
  return hooks;
}
