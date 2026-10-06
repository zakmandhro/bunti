import { describe, expect, test } from 'bun:test';
import { Spinner } from '../src/components/Spinner';
import { bunti, createScreenState, loop, render } from '../src/index';

describe('on-demand rendering (idle: "on-demand")', () => {
  test('idle loop renders frame 1 and does not tick while idle', async () => {
    let frameCount = 0;
    const state = createScreenState({ fps: 60, idle: 'on-demand' });

    const loopPromise = loop(state, () => {
      frameCount++;
    });

    // Wait 50ms - in continuous mode at 60fps this would be ~3 frames.
    // In on-demand mode, it must remain exactly 1 frame.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(frameCount).toBe(1);

    state.requestStop?.();
    await loopPromise;
  });

  test('ctx.requestRender() and ctx.invalidate() trigger re-render', async () => {
    let frameCount = 0;
    let contextRef: any;

    const renderPromise = render(
      (ctx) => {
        contextRef = ctx;
        frameCount++;
      },
      { fps: 60, idle: 'on-demand' },
    );

    // Initial frame
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(frameCount).toBe(1);

    // Request render
    contextRef.requestRender();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(frameCount).toBe(2);

    // Invalidate alias
    contextRef.invalidate();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(frameCount).toBe(3);

    contextRef.requestStop();
    await renderPromise;
  });

  test('useState setter triggers re-render in on-demand mode', async () => {
    let frameCount = 0;
    let setVal: (v: number) => void;
    let contextRef: any;

    const renderPromise = render(
      (ctx) => {
        contextRef = ctx;
        frameCount++;
        const [, set] = ctx.useState('counter', 0);
        setVal = set;
      },
      { fps: 60, idle: 'on-demand' },
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(frameCount).toBe(1);

    setVal!(42);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(frameCount).toBe(2);

    contextRef.requestStop();
    await renderPromise;
  });

  test('animate() ticks while running and settles into idle when finished', async () => {
    let frameCount = 0;
    let progress = 0;

    const renderPromise = render(
      (ctx) => {
        frameCount++;
        progress = ctx.animate(60, { id: 'test_anim' });
        if (progress >= 1 && frameCount >= 3) {
          ctx.requestStop();
        }
      },
      { fps: 60, idle: 'on-demand' },
    );

    await renderPromise;
    expect(progress).toBe(1);
    expect(frameCount).toBeGreaterThanOrEqual(2);
  });

  test('transition() ticks while active and settles into idle when mounted/unmounted', async () => {
    let frameCount = 0;
    const open = true;
    let currentProgress = 0;

    const renderPromise = render(
      (ctx) => {
        frameCount++;
        const t = ctx.transition('drawer', open, { duration: 50 });
        currentProgress = t.progress;
        if (currentProgress >= 1) {
          ctx.requestStop();
        }
      },
      { fps: 60, idle: 'on-demand' },
    );

    await renderPromise;
    expect(currentProgress).toBe(1);
    expect(frameCount).toBeGreaterThanOrEqual(2);
  });

  test('Spinner ticks while rendered on screen', async () => {
    let frameCount = 0;

    const renderPromise = render(
      (ctx) => {
        frameCount++;
        Spinner(ctx, { intervalMs: 20 });
        if (frameCount >= 3) {
          ctx.requestStop();
        }
      },
      { fps: 60, idle: 'on-demand' },
    );

    await renderPromise;
    expect(frameCount).toBeGreaterThanOrEqual(3);
  });
});

describe('ctx.list() and context serialization', () => {
  test('ctx.list() returns { index, item } and JSON.stringify is lightweight', () => {
    const state = createScreenState();
    const ctx = bunti.createScreenContext(state);

    const selection = ctx.list('menu', ['Apple', 'Banana', 'Cherry']);
    expect(selection).toEqual({ index: 0, item: 'Apple' });

    // Ensure serializing the selection does not pin CPU or dump buffers
    const jsonSelection = JSON.stringify(selection);
    expect(jsonSelection).toBe('{"index":0,"item":"Apple"}');

    // Ensure serializing ctx directly uses safe toJSON summary
    const jsonCtx = JSON.stringify(ctx);
    expect(jsonCtx).toContain('"width"');
    expect(jsonCtx).toContain('"height"');
    expect(jsonCtx).not.toContain('frontBuffer');
    expect(jsonCtx).not.toContain('backBuffer');
  });
});
