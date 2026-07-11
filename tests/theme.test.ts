import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  ansi256ToRGB,
  contrastText,
  hexToRGB,
  isThemeColor,
  relativeLuminance,
  resolveColor,
  resolveColorToRGB,
  rgbTo256,
} from '../src/colors';
import { detectColorTier, setColorTier } from '../src/detect';
import { createScreenContext } from '../src/dsl';
import { createScreenState } from '../src/state';
import {
  createTheme,
  darkTheme,
  isTheme,
  lightTheme,
  themeColor,
} from '../src/theme';
import { stripAnsi } from '../src/utils';

// Pin the tier for deterministic expectations; individual tests override
// and restore it.
beforeEach(() => setColorTier('truecolor'));
afterEach(() => setColorTier('truecolor'));

describe('ThemeColor', () => {
  test('is callable and returns an fg-styled ANSI string', () => {
    const primary = themeColor('#3bbce1');
    const out = primary('Mission Control');

    expect(out).toBe('\x1b[38;2;59;188;225mMission Control\x1b[0m');
    expect(stripAnsi(out)).toBe('Mission Control');
  });

  test('carries .rgb and .hex data', () => {
    const primary = themeColor('#3bbce1');

    expect(primary.rgb).toEqual({ r: 59, g: 188, b: 225 });
    expect(primary.hex).toBe('#3bbce1');
    expect(isThemeColor(primary)).toBe(true);
    expect(isThemeColor((s: string) => s)).toBe(false);
    expect(isThemeColor({ rgb: { r: 0, g: 0, b: 0 } })).toBe(false);
  });

  test('resolves palette names and ANSI-256 codes to exact RGB', () => {
    expect(themeColor('bunti-blue').rgb).toEqual({ r: 59, g: 188, b: 225 });
    expect(themeColor(196).rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('passes existing ThemeColors through unchanged', () => {
    const original = themeColor('#ff0055');
    expect(themeColor(original)).toBe(original);
  });
});

describe('createTheme derivation', () => {
  test('derives all tokens from a sparse input', () => {
    const theme = createTheme({
      background: '#1e1e2e',
      primary: '#89b4fa',
    });

    expect(isTheme(theme)).toBe(true);
    expect(theme.mode).toBe('dark'); // derived from background luminance
    expect(theme.background.hex).toBe('#1e1e2e');
    expect(theme.primary.hex).toBe('#89b4fa');
    // surface lifts toward white in dark mode
    expect(relativeLuminance(theme.surface.rgb)).toBeGreaterThan(
      relativeLuminance(theme.background.rgb),
    );
    expect(relativeLuminance(theme.surfaceRaised.rgb)).toBeGreaterThan(
      relativeLuminance(theme.surface.rgb),
    );
    // onPrimary auto-contrasts vs primary (light blue -> black text)
    expect(theme.onPrimary.rgb).toEqual({ r: 0, g: 0, b: 0 });
    // focus defaults to primary
    expect(theme.focus.hex).toBe(theme.primary.hex);
    // muted sits between foreground and background
    expect(relativeLuminance(theme.muted.rgb)).toBeLessThan(
      relativeLuminance(theme.foreground.rgb),
    );
  });

  test('derives light mode from a light background', () => {
    const theme = createTheme({ background: '#ffffff' });

    expect(theme.mode).toBe('light');
    // surface shifts toward black in light mode
    expect(relativeLuminance(theme.surface.rgb)).toBeLessThan(
      relativeLuminance(theme.background.rgb),
    );
    // foreground is near-black on white
    expect(relativeLuminance(theme.foreground.rgb)).toBeLessThan(0.1);
  });

  test('explicit tokens always win over derivation', () => {
    const theme = createTheme({
      mode: 'dark',
      surface: '#123456',
      onPrimary: '#abcdef',
    });

    expect(theme.surface.hex).toBe('#123456');
    expect(theme.onPrimary.hex).toBe('#abcdef');
  });

  test('built-in themes are complete and mode-correct', () => {
    expect(isTheme(darkTheme)).toBe(true);
    expect(isTheme(lightTheme)).toBe(true);
    expect(darkTheme.mode).toBe('dark');
    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.name).toBe('bunti-dark');
    expect(darkTheme.primary.rgb).toEqual({ r: 59, g: 188, b: 225 });
    expect(darkTheme.onPrimary.rgb).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('gradients pass through', () => {
    const theme = createTheme({
      gradients: { hero: ['#ff0000', { r: 0, g: 0, b: 255 }] },
    });
    expect(theme.gradients?.hero).toHaveLength(2);
  });
});

describe('resolveColor accepts ThemeColor', () => {
  test('as a plain color value', () => {
    expect(resolveColor(themeColor('#102030'))).toBe('2;16;32;48');
    expect(resolveColorToRGB(themeColor('#102030'))).toEqual({
      r: 16,
      g: 32,
      b: 48,
    });
  });

  test('through the fg text path (ctx.text + theme token)', () => {
    const state = createScreenState();
    state.width = 40;
    state.height = 4;
    const ctx = createScreenContext(state);

    ctx.text(ctx.theme.primary('Hi'));
    ctx.flushFlow();

    const cell = state.backBuffer.find((c) => c.char === 'H');
    expect(cell?.fg).toEqual(darkTheme.primary.rgb);
    expect(String(cell?.fgCode)).toBe(
      `2;${darkTheme.primary.rgb.r};${darkTheme.primary.rgb.g};${darkTheme.primary.rgb.b}`,
    );
  });

  test('through the bgColor path (direct box renderer)', () => {
    const state = createScreenState();
    state.width = 20;
    state.height = 5;
    const ctx = createScreenContext(state);

    ctx.box(
      {
        x: 0,
        y: 0,
        width: 10,
        height: 3,
        border: 'none',
        bgColor: ctx.theme.surface,
      },
      (b) => b.text('x'),
    );

    const cell = state.backBuffer[0];
    expect(cell?.bg).toEqual(darkTheme.surface.rgb);
  });

  test('through the borderColor path (ThemeColor detected before function wrappers)', () => {
    const state = createScreenState();
    state.width = 20;
    state.height = 5;
    const ctx = createScreenContext(state);

    ctx.box(
      {
        x: 0,
        y: 0,
        width: 10,
        height: 3,
        border: 'rounded',
        borderColor: ctx.theme.primary,
      },
      (b) => b.text('x'),
    );

    const corner = state.backBuffer.find((c) => c.char === '╭');
    expect(corner?.fg).toEqual(darkTheme.primary.rgb);
  });
});

describe('theme threading', () => {
  test('ctx.theme defaults to darkTheme', () => {
    const ctx = createScreenContext(createScreenState());
    expect(ctx.theme).toBe(darkTheme);
  });

  test('render options theme reaches ctx.theme', () => {
    const ctx = createScreenContext(createScreenState({ theme: lightTheme }));
    expect(ctx.theme).toBe(lightTheme);
  });

  test('setTheme swaps live and requests a rerender', () => {
    const state = createScreenState({ theme: darkTheme });
    let ticks = 0;
    (state as { requestTick?: () => void }).requestTick = () => ticks++;

    const ctx = createScreenContext(state);
    ctx.setTheme(lightTheme);

    expect(ticks).toBe(1);
    expect(state.theme).toBe(lightTheme);
    expect(createScreenContext(state).theme).toBe(lightTheme);
  });

  test('setTheme completes sparse inputs via createTheme', () => {
    const state = createScreenState();
    const ctx = createScreenContext(state);

    ctx.setTheme({ background: '#ffffff' });

    expect(state.theme?.mode).toBe('light');
    expect(isTheme(state.theme)).toBe(true);
  });

  test('themed overrides the subtree theme and restores it', () => {
    const ctx = createScreenContext(createScreenState({ theme: darkTheme }));
    const seen: string[] = [];

    ctx.themed(lightTheme, (sub) => {
      seen.push(sub.theme.name);
      seen.push(ctx.theme.name); // outer handle sees the override too
    });
    seen.push(ctx.theme.name);

    expect(seen).toEqual(['bunti-light', 'bunti-light', 'bunti-dark']);
  });

  test('themed partials overlay the current theme', () => {
    const ctx = createScreenContext(createScreenState({ theme: darkTheme }));

    ctx.themed({ primary: '#ff0055' }, (sub) => {
      expect(sub.theme.primary.hex).toBe('#ff0055');
      // untouched tokens come from the ambient theme
      expect(sub.theme.background.hex).toBe(darkTheme.background.hex);
      expect(sub.theme.mode).toBe('dark');
    });

    expect(ctx.theme.primary.hex).toBe(darkTheme.primary.hex);
  });

  test('themed applies to nested box contexts', () => {
    const state = createScreenState();
    state.width = 30;
    state.height = 6;
    const ctx = createScreenContext(state);

    let innerPrimary = '';
    ctx.themed({ primary: '#ff0055' }, (sub) => {
      sub.box({ x: 0, y: 0, width: 10, height: 3, border: 'none' }, (b) => {
        innerPrimary = b.theme.primary.hex;
        b.text(b.theme.primary('T'));
      });
    });

    expect(innerPrimary).toBe('#ff0055');
    const cell = state.backBuffer.find((c) => c.char === 'T');
    expect(cell?.fg).toEqual({ r: 255, g: 0, b: 85 });
  });
});

describe('256-color table exactness', () => {
  test('spot-checks known codes', () => {
    expect(ansi256ToRGB(21)).toEqual({ r: 0, g: 0, b: 255 });
    expect(ansi256ToRGB(196)).toEqual({ r: 255, g: 0, b: 0 });
    expect(ansi256ToRGB(244)).toEqual({ r: 128, g: 128, b: 128 });
    expect(ansi256ToRGB(16)).toEqual({ r: 0, g: 0, b: 0 });
    expect(ansi256ToRGB(231)).toEqual({ r: 255, g: 255, b: 255 });
    expect(ansi256ToRGB(232)).toEqual({ r: 8, g: 8, b: 8 });
    expect(ansi256ToRGB(255)).toEqual({ r: 238, g: 238, b: 238 });
  });

  test('resolveColorToRGB no longer falls back to gray for numeric codes', () => {
    expect(resolveColorToRGB(21)).toEqual({ r: 0, g: 0, b: 255 });
    expect(resolveColorToRGB('196')).toEqual({ r: 255, g: 0, b: 0 });
    // PALETTE names route through their ANSI codes
    expect(resolveColorToRGB('midnight')).toEqual({ r: 15, g: 15, b: 35 });
  });

  test('RGB->256 quantization roundtrips every cube and gray code', () => {
    for (let code = 16; code <= 255; code++) {
      expect(rgbTo256(ansi256ToRGB(code))).toBe(code);
    }
  });

  test('RGB->256 picks perceptually near codes for arbitrary colors', () => {
    expect(rgbTo256({ r: 0, g: 0, b: 254 })).toBe(21);
    expect(rgbTo256({ r: 127, g: 127, b: 127 })).toBe(244);
  });
});

describe('hex parsing with alpha', () => {
  test('#RRGGBBAA composites over black by default', () => {
    expect(hexToRGB('#ffffff80')).toEqual({ r: 128, g: 128, b: 128 });
    expect(hexToRGB('#ff000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRGB('#ff0000ff')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('#RRGGBBAA composites over a provided base', () => {
    expect(hexToRGB('#ffffff80', { r: 0, g: 0, b: 255 })).toEqual({
      r: 128,
      g: 128,
      b: 255,
    });
  });

  test('#RGBA shorthand expands and composites', () => {
    expect(hexToRGB('#f008')).toEqual({ r: 136, g: 0, b: 0 });
  });

  test('#RGB and #RRGGBB still parse exactly', () => {
    expect(hexToRGB('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRGB('#3bbce1')).toEqual({ r: 59, g: 188, b: 225 });
  });
});

describe('blank auto-contrast', () => {
  test('contrastText picks white on dark, black on light', () => {
    expect(contrastText('#0f0f23')).toEqual({ r: 255, g: 255, b: 255 });
    expect(contrastText('#ffffff')).toEqual({ r: 0, g: 0, b: 0 });
    expect(contrastText({ r: 128, g: 128, b: 128 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
    });
  });

  test("box color 'blank' renders black text on a light background", () => {
    const state = createScreenState();
    state.width = 20;
    state.height = 5;
    const ctx = createScreenContext(state);

    ctx.box(
      {
        x: 0,
        y: 0,
        width: 10,
        height: 3,
        border: 'none',
        bgColor: 'white',
        color: 'blank',
      },
      (b) => b.text('Hi'),
    );

    const cell = state.backBuffer.find((c) => c.char === 'H');
    expect(cell?.fg).toEqual({ r: 0, g: 0, b: 0 });
  });

  test("box color 'blank' renders white text on a dark background", () => {
    const state = createScreenState();
    state.width = 20;
    state.height = 5;
    const ctx = createScreenContext(state);

    ctx.box(
      {
        x: 0,
        y: 0,
        width: 10,
        height: 3,
        border: 'none',
        bgColor: '#0f0f23',
        color: 'blank',
      },
      (b) => b.text('Hi'),
    );

    const cell = state.backBuffer.find((c) => c.char === 'H');
    expect(cell?.fg).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('color capability tiers', () => {
  test('NO_COLOR maps to mono per spec (non-empty values only)', () => {
    expect(detectColorTier({ NO_COLOR: '1' })).toBe('mono');
    expect(
      detectColorTier({ NO_COLOR: 'anything', COLORTERM: 'truecolor' }),
    ).toBe('mono');
    expect(detectColorTier({ NO_COLOR: '', COLORTERM: 'truecolor' })).toBe(
      'truecolor',
    );
  });

  test('detects tiers from COLORTERM and TERM', () => {
    expect(detectColorTier({ COLORTERM: 'truecolor' })).toBe('truecolor');
    expect(detectColorTier({ COLORTERM: '24bit' })).toBe('truecolor');
    expect(detectColorTier({ TERM: 'xterm-256color' })).toBe('256');
    expect(detectColorTier({ TERM: 'xterm' })).toBe('16');
    expect(detectColorTier({ TERM: 'dumb' })).toBe('mono');
    expect(detectColorTier({ TERM: 'xterm-direct' })).toBe('truecolor');
    expect(detectColorTier({})).toBe('truecolor');
  });

  test('resolveColor quantizes RGB to 256 below truecolor', () => {
    setColorTier('256');
    expect(resolveColor({ r: 255, g: 0, b: 0 })).toBe(196);
    expect(resolveColor('#0000ff')).toBe(21);
    expect(resolveColor(themeColor('#808080'))).toBe(244);
    // native 256 codes pass through untouched
    expect(resolveColor(238)).toBe(238);
  });

  test('resolveColor quantizes down to the 16-color tier', () => {
    setColorTier('16');
    expect(resolveColor({ r: 255, g: 0, b: 0 })).toBe(9);
    expect(resolveColor({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(resolveColor(196)).toBe(9); // 256 code -> nearest base-16
    expect(resolveColor(7)).toBe(7); // base codes untouched
  });

  test('mono tier suppresses color output entirely', () => {
    setColorTier('mono');
    expect(resolveColor({ r: 255, g: 0, b: 0 })).toBeUndefined();
    expect(resolveColor('#ff0000')).toBeUndefined();
    expect(darkTheme.primary('plain')).toBe('plain');
  });

  test('ScreenOptions.colorTier overrides detection', () => {
    createScreenState({ colorTier: '256' });
    expect(resolveColor({ r: 0, g: 0, b: 255 })).toBe(21);
  });
});
