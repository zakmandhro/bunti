import { describe, expect, test } from 'bun:test';
import { NF_GLYPHS } from '../src/data/nf-glyphs';
import type { IconName } from '../src/data/nf-names';
import {
  __iconMisses,
  ICON_MAP,
  icon,
  init,
  nerd,
  register,
} from '../src/icons';
// Side-effect import: installs the full Nerd Fonts map into the registry.
import { installFullIcons } from '../src/icons-full';

const FA_ROCKET = '';

describe('Bunti Icon Engine', () => {
  test('curated lookup returns the Nerd Font glyph by default', () => {
    expect(icon('rocket')).toBe(FA_ROCKET);
    expect(icon('branch')).toBe('');
  });

  test('full-map lookup works after installing icons-full', () => {
    installFullIcons(); // idempotent; the import above already installed it
    expect(icon('fa-rocket')).toBe(NF_GLYPHS['fa-rocket']);
    expect(icon('fa-rocket')).toBe(FA_ROCKET);
    expect(icon('md-robot')).toBe(NF_GLYPHS['md-robot']);
    expect(icon('cod-account')).toBe(NF_GLYPHS['cod-account']);
  });

  test("a leading 'nf-' prefix is stripped for full-map lookups", () => {
    expect(icon('nf-fa-rocket')).toBe(icon('fa-rocket'));
    expect(icon('nf-oct-git_branch')).toBe(NF_GLYPHS['oct-git_branch']);
    expect(nerd('nf-fa-rocket')).toBe(FA_ROCKET);
  });

  test('curated ICON_MAP wins over the runtime registry', () => {
    register('rocket', '');
    expect(icon('rocket')).toBe(FA_ROCKET);
  });

  test('register() adds custom icons (bare glyph and full definition)', () => {
    register('my-glyph', '');
    expect(icon('my-glyph')).toBe('');

    register('my-def', { nf: '', ascii: 'd' });
    expect(icon('my-def')).toBe('');
  });

  test('ascii tier via init({ nerdFont: false })', async () => {
    try {
      await init({ nerdFont: false });
      // Curated fallbacks (post width-audit: all single ASCII chars).
      expect(icon('rocket')).toBe('R');
      expect(icon('bars')).toBe('=');
      expect(icon('planet')).toBe('O');
      expect(icon('checkbox')).toBe('#');
      // Registered definition uses its explicit ascii fallback.
      expect(icon('my-def')).toBe('d');
      // Bulk/bare-glyph registrations degrade to the generic '*'.
      expect(icon('fa-rocket')).toBe('*');
    } finally {
      await init({ nerdFont: true });
    }
  });

  test('unknown name returns empty string and buffers a warning', () => {
    const bogus = 'definitely-not-an-icon-xyz';
    expect(icon(bogus)).toBe('');
    expect(__iconMisses()).toContain(bogus);
  });

  test('curated ascii fallbacks are width-stable single ASCII chars', () => {
    for (const def of Object.values(ICON_MAP)) {
      expect(def.ascii.length).toBe(1);
      expect(def.ascii.charCodeAt(0)).toBeLessThanOrEqual(0x7f);
      expect([...def.nf].length).toBe(1);
    }
  });

  test('generated map glyphs are single code points of width 1 (sampled)', () => {
    const names = Object.keys(NF_GLYPHS) as IconName[];
    expect(names.length).toBeGreaterThan(10_000);
    for (let i = 0; i < names.length; i += 97) {
      const glyph = NF_GLYPHS[names[i]];
      expect([...glyph].length).toBe(1);
      expect(Bun.stringWidth(glyph)).toBe(1);
    }
  });
});
