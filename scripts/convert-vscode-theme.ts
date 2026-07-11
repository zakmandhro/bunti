/**
 * VS Code theme -> Bunti preset converter (internal build-time script).
 *
 * Reads a VS Code color theme JSON/JSONC file and emits a Bunti preset
 * module (a sparse ThemeInput completed by createTheme at module init).
 * The conversion itself is the pure `convertVSCodeTheme(json)` below —
 * kept side-effect free so it can be promoted to a public `fromVSCode()`
 * post-launch by simply re-exporting it from src/.
 *
 * Not supported (documented, throws): `include` chains — pre-resolve the
 * theme (VS Code's "Developer: Generate Color Theme From Current Settings")
 * or vendor the compiled JSON, as scripts/vscode-themes/ does.
 *
 * Usage:
 *   bun scripts/convert-vscode-theme.ts <theme.json> [--slug <slug>] [--out <file>]
 *   bun scripts/convert-vscode-theme.ts --presets   # regenerate src/themes/
 *   bun scripts/convert-vscode-theme.ts --audit     # resolved hexes + WCAG table
 */

import type { ColorValue } from '../src/colors';
import {
  hexToRGB,
  relativeLuminance,
  resolveColorToRGB,
  rgbToHex,
} from '../src/colors';
import type { RGB } from '../src/state';
import {
  createTheme,
  THEME_TOKENS,
  type ThemeInput,
  type ThemeMode,
  type ThemeToken,
} from '../src/theme';

// ---------------------------------------------------------------------------
// JSONC
// ---------------------------------------------------------------------------

/**
 * Strips JSONC syntax (// and block comments, trailing commas) so the result
 * parses with JSON.parse. String-aware: `"vscode://schemas/color-theme"` and
 * escaped quotes survive intact.
 */
export function stripJsonc(text: string): string {
  // Pass 1: remove comments outside strings.
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      out += ch;
      while (++i < text.length) {
        out += text[i]!;
        if (text[i] === '\\') out += text[++i] ?? '';
        else if (text[i] === '"') break;
      }
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i + 1] !== '\n') i++;
    } else if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
    } else {
      out += ch;
    }
  }
  // Pass 2: drop commas whose next significant char closes an object/array.
  let result = '';
  for (let i = 0; i < out.length; i++) {
    const ch = out[i]!;
    if (ch === '"') {
      result += ch;
      while (++i < out.length) {
        result += out[i]!;
        if (out[i] === '\\') result += out[++i] ?? '';
        else if (out[i] === '"') break;
      }
    } else if (ch === ',') {
      let j = i + 1;
      while (j < out.length && /\s/.test(out[j]!)) j++;
      if (out[j] === '}' || out[j] === ']') continue;
      result += ch;
    } else {
      result += ch;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Mapping table (workbench `colors` -> Bunti ThemeInput tokens)
// ---------------------------------------------------------------------------

/**
 * Ordered source keys per Bunti token; the first key present (with a valid
 * hex value) in the theme's workbench `colors` wins. Exported as data so it
 * is testable and can be documented alongside a future public fromVSCode().
 *
 * Two orderings were hand-tuned against the shipped presets:
 * - accent prefers activityBarBadge.background (badge.background is often a
 *   neutral gray or near-background: One Dark Pro, Tokyo Night).
 * - danger prefers editorError.foreground (Tokyo Night sets errorForeground
 *   to a muted gray-blue rather than a red).
 */
export const VSCODE_TOKEN_MAP = {
  background: ['editor.background'],
  surface: ['sideBar.background', 'editorWidget.background'],
  surfaceRaised: [
    'editorGroupHeader.tabsBackground',
    'titleBar.activeBackground',
  ],
  foreground: ['editor.foreground', 'foreground'],
  muted: ['descriptionForeground', 'disabledForeground'],
  primary: ['button.background'],
  onPrimary: ['button.foreground'],
  accent: ['activityBarBadge.background', 'badge.background'],
  border: ['panel.border', 'editorGroup.border', 'sideBar.border'],
  focus: ['focusBorder'],
  selection: ['list.activeSelectionBackground'],
  success: [
    'testing.iconPassed',
    'terminal.ansiGreen',
    'gitDecoration.addedResourceForeground',
  ],
  warning: ['editorWarning.foreground', 'list.warningForeground'],
  danger: ['editorError.foreground', 'errorForeground'],
  info: ['editorInfo.foreground'],
} as const satisfies Record<ThemeToken, readonly string[]>;

const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function modeFromType(type: unknown): ThemeMode | undefined {
  if (type === 'dark' || type === 'hc' || type === 'hc-black') return 'dark';
  if (type === 'light' || type === 'hc-light') return 'light';
  return undefined;
}

/**
 * Converts a parsed VS Code color theme (the JSON object) to a sparse Bunti
 * ThemeInput. Missing workbench keys are simply left undefined — createTheme
 * derives them. #RGBA/#RRGGBBAA values are composited over the resolved
 * editor.background (the background itself composites over black for dark
 * themes, white for light ones). Throws on `include` chains (unsupported).
 */
export function convertVSCodeTheme(json: unknown): ThemeInput {
  if (typeof json !== 'object' || json === null) {
    throw new Error('convertVSCodeTheme: expected a theme JSON object');
  }
  const theme = json as Record<string, unknown>;
  if (theme.include !== undefined) {
    throw new Error(
      'convertVSCodeTheme: `include` chains are not supported — ' +
        'pre-resolve the theme or use the compiled JSON',
    );
  }
  const colors = (
    typeof theme.colors === 'object' && theme.colors !== null
      ? theme.colors
      : {}
  ) as Record<string, unknown>;

  const pick = (sources: readonly string[]): string | undefined => {
    for (const key of sources) {
      const value = colors[key];
      if (typeof value === 'string' && HEX_RE.test(value)) return value;
    }
    return undefined;
  };

  const input: ThemeInput = {};
  if (typeof theme.name === 'string') input.name = theme.name;
  const mode = modeFromType(theme.type);
  if (mode) input.mode = mode;

  const bgRaw = pick(VSCODE_TOKEN_MAP.background);
  const bgBase: RGB =
    mode === 'light' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const bg = bgRaw ? hexToRGB(bgRaw, bgBase) : undefined;
  if (bg) input.background = rgbToHex(bg);

  for (const token of THEME_TOKENS) {
    if (token === 'background') continue;
    const raw = pick(VSCODE_TOKEN_MAP[token]);
    if (raw) input[token] = rgbToHex(hexToRGB(raw, bg ?? bgBase));
  }
  return input;
}

// ---------------------------------------------------------------------------
// WCAG helpers + auto-tune
// ---------------------------------------------------------------------------

/** WCAG 2.x contrast ratio (1..21) between two color values. */
export function contrastRatio(a: ColorValue, b: ColorValue): number {
  const la = relativeLuminance(resolveColorToRGB(a));
  const lb = relativeLuminance(resolveColorToRGB(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Minimum contrast each preset must clear (mirrored in tests/themes.test.ts). */
export const WCAG_GATES = {
  foregroundVsBackground: 4.5,
  mutedVsBackground: 2.5,
  onPrimaryVsPrimary: 4.5,
} as const;

/**
 * WCAG-driven cleanup of a converted ThemeInput: drops mapped values that
 * would fail the preset gates (or a muted identical to the foreground) so
 * createTheme derivation — which always satisfies them — takes over.
 * Pure; returns the tuned input plus human-readable notes.
 */
export function tuneConvertedTheme(input: ThemeInput): {
  input: ThemeInput;
  notes: string[];
} {
  const notes: string[] = [];
  const current: ThemeInput = { ...input };
  let theme = createTheme(current);

  const drop = (token: ThemeToken, why: string) => {
    delete current[token];
    notes.push(`dropped ${token} (${why}); deriving instead`);
    theme = createTheme(current);
  };

  if (current.foreground !== undefined) {
    const ratio = contrastRatio(theme.foreground, theme.background);
    if (ratio < WCAG_GATES.foregroundVsBackground) {
      drop('foreground', `${ratio.toFixed(2)}:1 vs background`);
    }
  }
  if (current.muted !== undefined) {
    if (theme.muted.hex === theme.foreground.hex) {
      drop('muted', 'identical to foreground');
    } else {
      const ratio = contrastRatio(theme.muted, theme.background);
      if (ratio < WCAG_GATES.mutedVsBackground) {
        drop('muted', `${ratio.toFixed(2)}:1 vs background`);
      }
    }
  }
  if (current.onPrimary !== undefined) {
    const ratio = contrastRatio(theme.onPrimary, theme.primary);
    if (ratio < WCAG_GATES.onPrimaryVsPrimary) {
      drop('onPrimary', `${ratio.toFixed(2)}:1 vs primary`);
    }
  }
  return { input: current, notes };
}

// ---------------------------------------------------------------------------
// Preset manifest (hand-tune overrides live here, never in generated files)
// ---------------------------------------------------------------------------

/** `null` forces derivation (drops the mapped value); a string replaces it. */
type PresetOverrides = Partial<Record<ThemeToken, string | null>>;

export interface PresetSpec {
  /** File name, `themes` record key, and generated Theme.name. */
  slug: string;
  /** TS export identifier. */
  exportName: string;
  displayName: string;
  /** Vendored source under scripts/vscode-themes/. */
  source: string;
  repo: string;
  license: string;
  overrides?: PresetOverrides;
  /** Why each override exists — emitted into the preset header. */
  tuning?: string[];
}

export const PRESETS: PresetSpec[] = [
  {
    slug: 'dracula',
    exportName: 'dracula',
    displayName: 'Dracula',
    source: 'dracula.json',
    repo: 'https://github.com/dracula/visual-studio-code',
    license: 'MIT',
    overrides: {
      primary: '#bd93f9',
      onPrimary: null,
      muted: '#6272a4',
      border: '#6272a4',
      focus: null,
      warning: '#ffb86c',
      info: '#8be9fd',
    },
    tuning: [
      'primary: button.background is the neutral #44475a; use the signature purple',
      'muted/border: #6272a4 is the canonical Dracula comment color',
      'focus: derive from primary (source swaps border/focus prominence)',
      'warning: Dracula sets editorWarning.foreground to its cyan; use its orange',
      'info: source omits editorInfo.foreground; use the Dracula cyan',
    ],
  },
  {
    slug: 'tokyo-night',
    exportName: 'tokyoNight',
    displayName: 'Tokyo Night',
    source: 'tokyo-night.json',
    repo: 'https://github.com/tokyo-night/tokyo-night-vscode-theme',
    license: 'MIT',
    overrides: {
      muted: '#565f89',
      surfaceRaised: '#292e42',
      accent: '#7aa2f7',
      focus: null,
    },
    tuning: [
      'muted: descriptionForeground fails 2.5:1; #565f89 is the theme comment color',
      'surfaceRaised: source equals surface; #292e42 is the bg-highlight shade',
      'accent: activityBarBadge duplicates the primary hue; #7aa2f7 is the signature blue',
      'focus: focusBorder is 20% alpha (near-invisible composited); derive from primary',
    ],
  },
  {
    slug: 'catppuccin-mocha',
    exportName: 'catppuccinMocha',
    displayName: 'Catppuccin Mocha',
    source: 'catppuccin-mocha.json',
    repo: 'https://github.com/catppuccin/vscode',
    license: 'MIT',
    overrides: {
      accent: '#f5c2e7',
    },
    tuning: [
      'accent: activityBarBadge duplicates the mauve primary; use Catppuccin pink',
      'muted auto-derives (descriptionForeground equals foreground); the derived',
      'value lands on overlay1',
    ],
  },
  {
    slug: 'nord',
    exportName: 'nord',
    displayName: 'Nord',
    source: 'nord.json',
    repo: 'https://github.com/nordtheme/visual-studio-code',
    license: 'MIT',
    overrides: {
      surface: '#3b4252',
      surfaceRaised: '#434c5e',
      border: '#4c566a',
      muted: null,
      selection: null,
      focus: null,
      accent: '#b48ead',
      info: '#81a1c1',
    },
    tuning: [
      'surface/surfaceRaised: source is flat (all #2e3440); use nord1/nord2',
      'border: nord3 so it stays visible on the lifted surfaces',
      'muted: descriptionForeground is 90%-alpha foreground (too bright); derive',
      'selection: source uses bright nord8 as a bg (unreadable under light text); derive',
      'focus: focusBorder is nord1 (invisible); derive from primary',
      'accent: badge colors duplicate the frost primary; use nord15 purple',
      'info: source omits editorInfo.foreground; use nord9 blue',
    ],
  },
  {
    slug: 'one-dark-pro',
    exportName: 'oneDarkPro',
    displayName: 'One Dark Pro',
    source: 'one-dark-pro.json',
    repo: 'https://github.com/Binaryify/OneDark-Pro',
    license: 'MIT',
    overrides: {
      primary: '#61afef',
      accent: '#c678dd',
      info: '#56b6c2',
      surfaceRaised: '#353b45',
      focus: null,
    },
    tuning: [
      'primary: button.background is the muddy #404754; use the signature blue',
      'accent: activityBarBadge blue is too close to primary; use the purple',
      'info: source omits editorInfo.foreground; use the One Dark cyan',
      'surfaceRaised: source equals surface; use the menu/dropdown shade',
      'focus: focusBorder equals border (invisible); derive from primary',
    ],
  },
  {
    slug: 'github-light',
    exportName: 'githubLight',
    displayName: 'GitHub Light',
    source: 'github-light.json',
    repo: 'https://github.com/primer/github-vscode-theme',
    license: 'MIT',
    overrides: {
      primary: '#0969da',
      accent: '#8250df',
      surfaceRaised: '#eaeef2',
      selection: null,
    },
    tuning: [
      "primary: button.background green sits at ~4.5:1 with white; GitHub's brand",
      'blue is the safer, more recognizable primary',
      'accent: badge.background would duplicate the new primary; use GitHub purple',
      'surfaceRaised: source equals surface; use Primer gray-1',
      'selection: source value composites to near-white; derive a visible one',
    ],
  },
];

// ---------------------------------------------------------------------------
// Code emission
// ---------------------------------------------------------------------------

const GENERATED_NOTE =
  'Generated by scripts/convert-vscode-theme.ts - do not edit by hand.\n' +
  ' * Regenerate: bun scripts/convert-vscode-theme.ts --presets';

function applyOverrides(
  input: ThemeInput,
  overrides: PresetOverrides = {},
): ThemeInput {
  const result: ThemeInput = { ...input };
  for (const [token, value] of Object.entries(overrides)) {
    if (value === null) delete result[token as ThemeToken];
    else result[token as ThemeToken] = value;
  }
  return result;
}

/** Renders a tuned ThemeInput as a src/themes/ preset module. */
export function emitPresetModule(spec: PresetSpec, input: ThemeInput): string {
  const mode: ThemeMode =
    input.mode ??
    (input.background !== undefined &&
    relativeLuminance(resolveColorToRGB(input.background)) > 0.5
      ? 'light'
      : 'dark');
  const lines: string[] = [];
  lines.push('/**');
  lines.push(` * ${spec.displayName} — Bunti preset theme (${mode}).`);
  lines.push(' *');
  lines.push(` * Converted from the "${spec.displayName}" VS Code theme.`);
  lines.push(` * Source: ${spec.repo} (${spec.license} license).`);
  lines.push(` * Vendored theme JSON: scripts/vscode-themes/${spec.source}`);
  if (spec.tuning?.length) {
    lines.push(' *');
    lines.push(' * Hand-tuning (applied by the converter, see PRESETS):');
    for (const note of spec.tuning) lines.push(` * - ${note}`);
  }
  lines.push(' *');
  lines.push(` * ${GENERATED_NOTE}`);
  lines.push(' */');
  lines.push("import { createTheme, type Theme } from '../theme';");
  lines.push('');
  lines.push(`/** ${spec.displayName} preset theme (${mode}). */`);
  lines.push(`export const ${spec.exportName}: Theme = createTheme({`);
  lines.push(`  name: '${spec.slug}',`);
  lines.push(`  mode: '${mode}',`);
  for (const token of THEME_TOKENS) {
    const value = input[token];
    if (typeof value === 'string') {
      lines.push(`  ${token}: '${value.toLowerCase()}',`);
    }
  }
  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

function emitIndexModule(specs: PresetSpec[]): string {
  const sorted = [...specs].sort((a, b) => a.slug.localeCompare(b.slug));
  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Bunti preset themes, converted from popular VS Code themes.');
  lines.push(' *');
  lines.push(" * import { themes, dracula } from '@zakmandhro/bunti/themes';");
  lines.push(' *');
  lines.push(` * ${GENERATED_NOTE}`);
  lines.push(' */');
  lines.push("import type { Theme } from '../theme';");
  for (const s of sorted) {
    lines.push(`import { ${s.exportName} } from './${s.slug}';`);
  }
  lines.push('');
  lines.push(`export { ${sorted.map((s) => s.exportName).join(', ')} };`);
  lines.push('');
  lines.push('/** All preset themes, keyed by slug. */');
  lines.push('export const themes: Record<string, Theme> = {');
  for (const s of sorted) {
    const key = s.slug.includes('-') ? `'${s.slug}'` : s.slug;
    const entry = key === s.exportName ? key : `${key}: ${s.exportName}`;
    lines.push(`  ${entry},`);
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function loadThemeJson(path: string): Promise<unknown> {
  const text = await Bun.file(path).text();
  return JSON.parse(stripJsonc(text));
}

function buildPresetInput(spec: PresetSpec, json: unknown): ThemeInput {
  const converted = convertVSCodeTheme(json);
  const overridden = applyOverrides(converted, spec.overrides);
  const { input, notes } = tuneConvertedTheme(overridden);
  for (const note of notes) console.log(`  [tune] ${spec.slug}: ${note}`);
  return input;
}

async function regeneratePresets(): Promise<void> {
  const themesDir = new URL('../src/themes/', import.meta.url).pathname;
  for (const spec of PRESETS) {
    const sourcePath = new URL(
      `./vscode-themes/${spec.source}`,
      import.meta.url,
    ).pathname;
    const input = buildPresetInput(spec, await loadThemeJson(sourcePath));
    const outPath = `${themesDir}${spec.slug}.ts`;
    await Bun.write(outPath, emitPresetModule(spec, input));
    console.log(`  wrote ${outPath}`);
  }
  const indexPath = `${themesDir}index.ts`;
  await Bun.write(indexPath, emitIndexModule(PRESETS));
  console.log(`  wrote ${indexPath}`);
}

async function auditPresets(): Promise<void> {
  const { themes } = await import('../src/themes/index');
  const { darkTheme, lightTheme } = await import('../src/theme');
  const all = { ...themes, 'bunti-dark': darkTheme, 'bunti-light': lightTheme };
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(
    pad('token', 14) +
      Object.keys(all)
        .map((n) => pad(n, 18))
        .join(''),
  );
  for (const token of THEME_TOKENS) {
    console.log(
      pad(token, 14) +
        Object.values(all)
          .map((t) => pad(t[token].hex, 18))
          .join(''),
    );
  }
  console.log(
    `\n${pad('mode', 14)}${Object.values(all)
      .map((t) => pad(t.mode, 18))
      .join('')}`,
  );
  console.log(
    '\nWCAG gates (fg/bg >= 4.5, muted/bg >= 2.5, onPrimary/primary >= 4.5):',
  );
  for (const [name, t] of Object.entries(all)) {
    const fg = contrastRatio(t.foreground, t.background);
    const muted = contrastRatio(t.muted, t.background);
    const onP = contrastRatio(t.onPrimary, t.primary);
    const ok =
      fg >= WCAG_GATES.foregroundVsBackground &&
      muted >= WCAG_GATES.mutedVsBackground &&
      onP >= WCAG_GATES.onPrimaryVsPrimary;
    console.log(
      `  ${pad(name, 18)} fg ${fg.toFixed(2).padStart(5)}  muted ${muted
        .toFixed(2)
        .padStart(5)}  onPrimary ${onP.toFixed(2).padStart(5)}  ${
        ok ? 'PASS' : 'FAIL'
      }`,
    );
  }
}

async function convertSingle(args: string[]): Promise<void> {
  const path = args.find((a) => !a.startsWith('--'));
  if (!path) {
    console.error(
      'Usage: bun scripts/convert-vscode-theme.ts <theme.json> ' +
        '[--slug <slug>] [--out <file>] | --presets | --audit',
    );
    process.exit(1);
  }
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const json = await loadThemeJson(path);
  const converted = convertVSCodeTheme(json);
  const slug =
    flag('--slug') ??
    (converted.name ?? 'converted-theme')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const exportName = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const { input, notes } = tuneConvertedTheme(converted);
  for (const note of notes) console.log(`// [tune] ${note}`);
  const spec: PresetSpec = {
    slug,
    exportName,
    displayName: converted.name ?? slug,
    source: path,
    repo: '(local file)',
    license: 'see source',
  };
  const module = emitPresetModule(spec, input);
  const out = flag('--out');
  if (out) {
    await Bun.write(out, module);
    console.log(`wrote ${out}`);
  } else {
    console.log(module);
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes('--presets')) await regeneratePresets();
  else if (args.includes('--audit')) await auditPresets();
  else await convertSingle(args);
}
