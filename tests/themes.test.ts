/**
 * Preset themes + VS Code converter tests.
 *
 * Guards the six shipped presets (WCAG gates, mode correctness) and the
 * internal converter in scripts/convert-vscode-theme.ts (JSONC stripping,
 * alpha compositing, mapping precedence, tune pass, sparse derivation).
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  contrastRatio,
  convertVSCodeTheme,
  PRESETS,
  stripJsonc,
  tuneConvertedTheme,
  VSCODE_TOKEN_MAP,
  WCAG_GATES,
} from '../scripts/convert-vscode-theme';
import { relativeLuminance } from '../src/colors';
import { setColorTier } from '../src/detect';
import {
  createTheme,
  darkTheme,
  isTheme,
  lightTheme,
  THEME_TOKENS,
  type Theme,
} from '../src/theme';
import { themes } from '../src/themes/index';

beforeEach(() => setColorTier('truecolor'));
afterEach(() => setColorTier('truecolor'));

const PRESET_SLUGS = [
  'dracula',
  'tokyo-night',
  'catppuccin-mocha',
  'nord',
  'one-dark-pro',
  'github-light',
] as const;

const EXPECTED_MODES: Record<string, 'dark' | 'light'> = {
  dracula: 'dark',
  'tokyo-night': 'dark',
  'catppuccin-mocha': 'dark',
  nord: 'dark',
  'one-dark-pro': 'dark',
  'github-light': 'light',
};

describe('shipped presets', () => {
  test('ships all six presets under their slugs', () => {
    expect(Object.keys(themes).sort()).toEqual([...PRESET_SLUGS].sort());
    for (const slug of PRESET_SLUGS) {
      const theme = themes[slug]!;
      expect(isTheme(theme)).toBe(true);
      expect(theme.name).toBe(slug);
    }
  });

  test('mode is correct per preset (GitHub Light reads as light)', () => {
    for (const slug of PRESET_SLUGS) {
      expect(themes[slug]!.mode).toBe(EXPECTED_MODES[slug]!);
    }
    // Not just the label: the background really is light.
    expect(
      relativeLuminance(themes['github-light']!.background.rgb),
    ).toBeGreaterThan(0.5);
    expect(relativeLuminance(themes.dracula!.background.rgb)).toBeLessThan(0.5);
  });

  const gated: [string, Theme][] = [
    ...PRESET_SLUGS.map((slug): [string, Theme] => [slug, themes[slug]!]),
    ['bunti-dark', darkTheme],
    ['bunti-light', lightTheme],
  ];

  for (const [name, theme] of gated) {
    test(`${name} passes the WCAG gates`, () => {
      expect(
        contrastRatio(theme.foreground, theme.background),
      ).toBeGreaterThanOrEqual(WCAG_GATES.foregroundVsBackground);
      expect(
        contrastRatio(theme.muted, theme.background),
      ).toBeGreaterThanOrEqual(WCAG_GATES.mutedVsBackground);
      expect(
        contrastRatio(theme.onPrimary, theme.primary),
      ).toBeGreaterThanOrEqual(WCAG_GATES.onPrimaryVsPrimary);
    });

    test(`${name} keeps its layers and primary visually distinct`, () => {
      expect(theme.surface.hex).not.toBe(theme.background.hex);
      expect(theme.surfaceRaised.hex).not.toBe(theme.surface.hex);
      expect(
        contrastRatio(theme.primary, theme.background),
      ).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('stripJsonc', () => {
  test('strips line comments, block comments, and trailing commas', () => {
    const jsonc = `{
      // line comment
      "a": 1, /* block
      comment */ "b": [1, 2,],
      "c": {"d": 3,},
    }`;
    expect(JSON.parse(stripJsonc(jsonc))).toEqual({
      a: 1,
      b: [1, 2],
      c: { d: 3 },
    });
  });

  test('preserves // inside strings (vscode:// schema URLs)', () => {
    const jsonc = '{"$schema": "vscode://schemas/color-theme", "a": 1,}';
    expect(JSON.parse(stripJsonc(jsonc))).toEqual({
      $schema: 'vscode://schemas/color-theme',
      a: 1,
    });
  });

  test('preserves escaped quotes and comment-like content in strings', () => {
    const jsonc = '{"a": "say \\"hi\\" // not a comment /* nor this */",}';
    expect(JSON.parse(stripJsonc(jsonc))).toEqual({
      a: 'say "hi" // not a comment /* nor this */',
    });
  });

  test('does not treat commas inside strings as trailing commas', () => {
    const jsonc = '{"a": ",}", "b": 1}';
    expect(JSON.parse(stripJsonc(jsonc))).toEqual({ a: ',}', b: 1 });
  });

  test('parses every vendored theme source', async () => {
    for (const preset of PRESETS) {
      const path = new URL(
        `../scripts/vscode-themes/${preset.source}`,
        import.meta.url,
      ).pathname;
      const parsed = JSON.parse(stripJsonc(await Bun.file(path).text())) as {
        colors?: Record<string, string>;
      };
      expect(typeof parsed.colors).toBe('object');
      expect(Object.keys(parsed.colors ?? {}).length).toBeGreaterThan(10);
    }
  });
});

describe('convertVSCodeTheme', () => {
  test('maps every ThemeToken in the mapping table', () => {
    expect(Object.keys(VSCODE_TOKEN_MAP).sort()).toEqual(
      [...THEME_TOKENS].sort(),
    );
  });

  test('prefers the first-present source per token', () => {
    const input = convertVSCodeTheme({
      type: 'dark',
      colors: {
        'editor.foreground': '#aaaaaa',
        foreground: '#bbbbbb',
        'activityBarBadge.background': '#cccccc',
        'badge.background': '#dddddd',
      },
    });
    expect(input.foreground).toBe('#aaaaaa');
    expect(input.accent).toBe('#cccccc');
  });

  test('falls back to later sources when earlier ones are absent', () => {
    const input = convertVSCodeTheme({
      type: 'dark',
      colors: {
        foreground: '#bbbbbb',
        'badge.background': '#dddddd',
        'terminal.ansiGreen': '#00ff00',
      },
    });
    expect(input.foreground).toBe('#bbbbbb');
    expect(input.accent).toBe('#dddddd');
    expect(input.success).toBe('#00ff00');
  });

  test('composites #RRGGBBAA over the resolved editor.background', () => {
    const input = convertVSCodeTheme({
      type: 'dark',
      colors: {
        'editor.background': '#000000',
        focusBorder: '#ffffff80',
      },
    });
    expect(input.focus).toBe('#808080');
  });

  test('composites #RGBA shorthand and background alpha over black/white', () => {
    const dark = convertVSCodeTheme({
      type: 'dark',
      colors: { 'editor.background': '#ffffff80' },
    });
    expect(dark.background).toBe('#808080'); // over black

    const light = convertVSCodeTheme({
      type: 'light',
      colors: {
        'editor.background': '#0000',
        focusBorder: '#fff8',
      },
    });
    expect(light.background).toBe('#ffffff'); // fully transparent over white
    expect(light.focus).toBe('#ffffff'); // #fff at 53% over white stays white
  });

  test('maps the type field to mode (hc variants included)', () => {
    expect(convertVSCodeTheme({ type: 'dark', colors: {} }).mode).toBe('dark');
    expect(convertVSCodeTheme({ type: 'light', colors: {} }).mode).toBe(
      'light',
    );
    expect(convertVSCodeTheme({ type: 'hc', colors: {} }).mode).toBe('dark');
    expect(convertVSCodeTheme({ type: 'hc-light', colors: {} }).mode).toBe(
      'light',
    );
    expect(convertVSCodeTheme({ colors: {} }).mode).toBeUndefined();
  });

  test('leaves unmapped keys undefined and ignores invalid values', () => {
    const input = convertVSCodeTheme({
      name: 'Sparse',
      colors: {
        'editor.background': '#101010',
        'button.background': 'red', // not hex — ignored
        focusBorder: '#12345', // wrong length — ignored
      },
    });
    expect(input.name).toBe('Sparse');
    expect(input.background).toBe('#101010');
    expect(input.primary).toBeUndefined();
    expect(input.focus).toBeUndefined();
    expect(input.muted).toBeUndefined();
  });

  test('throws on include chains and non-object input', () => {
    expect(() =>
      convertVSCodeTheme({ include: './base.json', colors: {} }),
    ).toThrow(/include/);
    expect(() => convertVSCodeTheme(null)).toThrow();
    expect(() => convertVSCodeTheme('nope')).toThrow();
  });

  test('sparse output completes through createTheme derivation', () => {
    const input = convertVSCodeTheme({
      name: 'Minimal',
      colors: {
        'editor.background': '#fafafa',
        'button.background': '#0969da',
      },
    });
    const theme = createTheme(input);
    expect(isTheme(theme)).toBe(true);
    expect(theme.mode).toBe('light'); // derived from background luminance
    expect(theme.background.hex).toBe('#fafafa');
    expect(theme.primary.hex).toBe('#0969da');
    // Derived tokens satisfy the gates.
    expect(
      contrastRatio(theme.foreground, theme.background),
    ).toBeGreaterThanOrEqual(WCAG_GATES.foregroundVsBackground);
    expect(
      contrastRatio(theme.onPrimary, theme.primary),
    ).toBeGreaterThanOrEqual(WCAG_GATES.onPrimaryVsPrimary);
  });
});

describe('tuneConvertedTheme', () => {
  test('drops onPrimary that fails 4.5:1 vs primary', () => {
    const { input, notes } = tuneConvertedTheme({
      background: '#000000',
      primary: '#888888',
      onPrimary: '#777777',
    });
    expect(input.onPrimary).toBeUndefined();
    expect(notes.some((n) => n.includes('onPrimary'))).toBe(true);
    expect(
      contrastRatio(createTheme(input).onPrimary, createTheme(input).primary),
    ).toBeGreaterThanOrEqual(WCAG_GATES.onPrimaryVsPrimary);
  });

  test('drops muted identical to foreground (Catppuccin/One Dark case)', () => {
    const { input } = tuneConvertedTheme({
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      muted: '#cdd6f4',
    });
    expect(input.muted).toBeUndefined();
    expect(input.foreground).toBe('#cdd6f4');
  });

  test('drops muted below 2.5:1 vs background (Tokyo Night case)', () => {
    const { input } = tuneConvertedTheme({
      background: '#1a1b26',
      foreground: '#a9b1d6',
      muted: '#515670',
    });
    expect(input.muted).toBeUndefined();
    expect(
      contrastRatio(createTheme(input).muted, createTheme(input).background),
    ).toBeGreaterThanOrEqual(WCAG_GATES.mutedVsBackground);
  });

  test('drops a low-contrast foreground so derivation takes over', () => {
    const { input } = tuneConvertedTheme({
      background: '#202020',
      foreground: '#303030',
    });
    expect(input.foreground).toBeUndefined();
    expect(
      contrastRatio(
        createTheme(input).foreground,
        createTheme(input).background,
      ),
    ).toBeGreaterThanOrEqual(WCAG_GATES.foregroundVsBackground);
  });

  test('leaves passing values untouched', () => {
    const spec = {
      background: '#282a36',
      foreground: '#f8f8f2',
      muted: '#6272a4',
      primary: '#bd93f9',
      onPrimary: '#000000',
    };
    const { input, notes } = tuneConvertedTheme(spec);
    expect(input).toEqual(spec);
    expect(notes).toEqual([]);
  });
});
