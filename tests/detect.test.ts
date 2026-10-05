import { afterAll, describe, expect, test } from 'bun:test';
import {
  detectCapabilities,
  detectColorTier,
  type HostInfo,
  identifyTerminal,
  type TerminalProfile,
} from '../src/detect';
import { icon, init } from '../src/icons';

// All tests pass explicit env objects — identifyTerminal is a pure function,
// so nothing here mutates process.env. Host-sensitive cases pass a fixed
// HostInfo so results don't depend on the machine running the suite.

const LINUX: HostInfo = { platform: 'linux', release: '6.8.0' };
const WIN11: HostInfo = { platform: 'win32', release: '10.0.26100' };
const WIN10: HostInfo = { platform: 'win32', release: '10.0.19045' };

const GHOSTTY_ENV = {
  GHOSTTY_RESOURCES_DIR: '/Applications/Ghostty.app/Contents/Resources',
  TERM: 'xterm-ghostty',
  TERM_PROGRAM: 'ghostty',
  TERM_PROGRAM_VERSION: '1.2.0',
  COLORTERM: 'truecolor',
};

const APPLE_TERMINAL_ENV = {
  TERM_PROGRAM: 'Apple_Terminal',
  TERM_PROGRAM_VERSION: '453',
  TERM: 'xterm-256color',
};

describe('identifyTerminal env matrix', () => {
  const matrix: {
    name: string;
    env: Record<string, string | undefined>;
    expected: Partial<TerminalProfile>;
  }[] = [
    {
      name: 'ghostty (full env)',
      env: GHOSTTY_ENV,
      expected: {
        app: 'ghostty',
        version: '1.2.0',
        truecolor: true,
        syncOutput: true,
        nerdFont: 'yes',
        source: 'env',
      },
    },
    {
      // The old code matched TERM_PROGRAM === 'Ghostty' (capitalized), which
      // never fires: Ghostty announces itself lowercase.
      name: 'ghostty via lowercase TERM_PROGRAM only',
      env: { TERM_PROGRAM: 'ghostty' },
      expected: { app: 'ghostty', nerdFont: 'yes', syncOutput: true },
    },
    {
      name: 'ghostty via GHOSTTY_RESOURCES_DIR only',
      env: { GHOSTTY_RESOURCES_DIR: '/opt/ghostty', TERM: 'xterm-ghostty' },
      expected: { app: 'ghostty', nerdFont: 'yes', version: undefined },
    },
    {
      name: 'kitty via KITTY_WINDOW_ID',
      env: { KITTY_WINDOW_ID: '1', TERM: 'xterm-kitty' },
      expected: {
        app: 'kitty',
        truecolor: true,
        syncOutput: true,
        nerdFont: 'assumed-yes',
      },
    },
    {
      name: 'kitty via TERM only',
      env: { TERM: 'xterm-kitty' },
      expected: { app: 'kitty', truecolor: true },
    },
    {
      name: 'wezterm',
      env: {
        WEZTERM_PANE: '0',
        TERM_PROGRAM: 'WezTerm',
        TERM_PROGRAM_VERSION: '20240203-110809-5046fc22',
        TERM: 'xterm-256color',
      },
      expected: {
        app: 'wezterm',
        version: '20240203-110809-5046fc22',
        truecolor: true,
        syncOutput: true,
        nerdFont: 'assumed-yes',
      },
    },
    {
      name: 'wezterm via TERM_PROGRAM only',
      env: { TERM_PROGRAM: 'WezTerm' },
      expected: { app: 'wezterm' },
    },
    {
      name: 'iterm2 via TERM_PROGRAM',
      env: {
        TERM_PROGRAM: 'iTerm.app',
        TERM_PROGRAM_VERSION: '3.5.0',
        TERM: 'xterm-256color',
      },
      expected: {
        app: 'iterm2',
        version: '3.5.0',
        truecolor: true,
        syncOutput: true,
        nerdFont: 'assumed-yes',
      },
    },
    {
      name: 'iterm2 via LC_TERMINAL (ssh passthrough)',
      env: {
        LC_TERMINAL: 'iTerm2',
        LC_TERMINAL_VERSION: '3.5.2',
        TERM: 'xterm-256color',
      },
      expected: { app: 'iterm2', version: '3.5.2' },
    },
    {
      name: 'alacritty',
      env: { ALACRITTY_WINDOW_ID: '5', TERM: 'alacritty' },
      expected: {
        app: 'alacritty',
        truecolor: true,
        syncOutput: true,
        nerdFont: 'assumed-yes',
      },
    },
    {
      name: 'vscode',
      env: {
        TERM_PROGRAM: 'vscode',
        TERM_PROGRAM_VERSION: '1.90.0',
        TERM: 'xterm-256color',
      },
      expected: {
        app: 'vscode',
        version: '1.90.0',
        truecolor: true,
        syncOutput: false,
        nerdFont: 'assumed-no',
      },
    },
    {
      // Apple Terminal was WRONGLY in the old optimistic nerd-font list; it
      // ships stock fonts and caps at 256 colors.
      name: 'apple-terminal',
      env: APPLE_TERMINAL_ENV,
      expected: {
        app: 'apple-terminal',
        version: '453',
        truecolor: false,
        syncOutput: false,
        nerdFont: 'assumed-no',
      },
    },
    {
      name: 'warp',
      env: {
        TERM_PROGRAM: 'WarpTerminal',
        TERM_PROGRAM_VERSION: '0.2024.05.21',
        TERM: 'xterm-256color',
      },
      expected: {
        app: 'warp',
        version: '0.2024.05.21',
        truecolor: true,
        syncOutput: true,
        nerdFont: 'assumed-yes',
      },
    },
    {
      name: 'unknown 256-color terminal',
      env: { TERM: 'xterm-256color' },
      expected: {
        app: 'unknown',
        truecolor: false,
        syncOutput: false,
        nerdFont: 'assumed-no',
        source: 'env',
      },
    },
    {
      name: 'empty env (optimistic truecolor fallback, conservative NF)',
      env: {},
      expected: { app: 'unknown', truecolor: true, nerdFont: 'assumed-no' },
    },
  ];

  for (const { name, env, expected } of matrix) {
    test(name, () => {
      const profile = identifyTerminal(env, LINUX);
      for (const [key, value] of Object.entries(expected)) {
        expect(profile[key as keyof TerminalProfile]).toEqual(value as never);
      }
    });
  }
});

describe('identifyTerminal on Windows', () => {
  const matrix: {
    name: string;
    env: Record<string, string | undefined>;
    host: HostInfo;
    expected: Partial<TerminalProfile>;
  }[] = [
    {
      name: 'Windows Terminal (WT_SESSION)',
      env: { WT_SESSION: 'a1b2c3d4-0000-0000-0000-000000000000' },
      host: WIN10,
      expected: {
        app: 'windows-terminal',
        truecolor: true,
        syncOutput: false,
        nerdFont: 'assumed-no',
      },
    },
    {
      // Default-terminal handoff sets no env (microsoft/terminal#13006).
      name: 'Windows 11 with no env signal assumes Windows Terminal',
      env: {},
      host: WIN11,
      expected: { app: 'windows-terminal', truecolor: true },
    },
    {
      name: 'Windows 10 with no env signal is conhost',
      env: {},
      host: WIN10,
      expected: { app: 'conhost', truecolor: true, nerdFont: 'assumed-no' },
    },
    {
      name: 'VS Code launched from a Windows Terminal tab stays vscode',
      env: {
        WT_SESSION: 'a1b2c3d4-0000-0000-0000-000000000000',
        TERM_PROGRAM: 'vscode',
        TERM_PROGRAM_VERSION: '1.105.0',
      },
      host: WIN11,
      expected: { app: 'vscode', version: '1.105.0', truecolor: true },
    },
    {
      name: 'JetBrains terminal',
      env: {
        TERMINAL_EMULATOR: 'JetBrains-JediTerm',
        TERM: 'xterm-256color',
      },
      host: WIN11,
      expected: { app: 'jetbrains', truecolor: true, nerdFont: 'assumed-no' },
    },
    {
      // mintty defaults to TERM=xterm, which alone would read as 16-color.
      name: 'mintty (Git Bash)',
      env: {
        TERM_PROGRAM: 'mintty',
        TERM_PROGRAM_VERSION: '3.7.4',
        TERM: 'xterm',
        MSYSTEM: 'MINGW64',
      },
      host: WIN11,
      expected: { app: 'mintty', version: '3.7.4', truecolor: true },
    },
    {
      name: 'ConEmu (version from ConEmuBuild)',
      env: { ConEmuANSI: 'ON', ConEmuPID: '4242', ConEmuBuild: '230724' },
      host: WIN10,
      expected: { app: 'conemu', version: '230724', truecolor: true },
    },
    {
      name: 'WSL inside Windows Terminal (WT_SESSION forwarded)',
      env: {
        WT_SESSION: 'a1b2c3d4-0000-0000-0000-000000000000',
        WSL_DISTRO_NAME: 'Ubuntu',
        TERM: 'xterm-256color',
      },
      host: { platform: 'linux', release: '6.6.87.2-microsoft-standard-WSL2' },
      expected: { app: 'windows-terminal', truecolor: true },
    },
    {
      name: 'psmux is reported as tmux',
      env: { TMUX: 'psmux,1234,0', WT_SESSION: 'x' },
      host: WIN11,
      expected: { app: 'windows-terminal', multiplexer: 'tmux' },
    },
  ];

  for (const { name, env, host, expected } of matrix) {
    test(name, () => {
      const profile = identifyTerminal(env, host);
      for (const [key, value] of Object.entries(expected)) {
        expect(profile[key as keyof TerminalProfile]).toEqual(value as never);
      }
    });
  }

  test('conhost color tier follows the Windows build like Node', () => {
    const win = (build: number): HostInfo => ({
      platform: 'win32',
      release: `10.0.${build}`,
    });
    expect(detectColorTier({}, win(15063))).toBe('truecolor');
    expect(detectColorTier({}, win(14931))).toBe('truecolor');
    expect(detectColorTier({}, win(10586))).toBe('256');
    expect(detectColorTier({}, win(10240))).toBe('16');
    expect(
      detectColorTier({}, { platform: 'win32', release: '6.3.9600' }),
    ).toBe('16');
  });

  test('NO_COLOR and an explicit TERM still win on Windows', () => {
    expect(detectColorTier({ NO_COLOR: '1' }, WIN11)).toBe('mono');
    expect(detectColorTier({ TERM: 'xterm-256color' }, WIN11)).toBe('256');
  });
});

describe('nerd font override precedence', () => {
  test('BUNTI_NF=1 forces nerd fonts on, even on Apple Terminal', () => {
    const profile = identifyTerminal({ ...APPLE_TERMINAL_ENV, BUNTI_NF: '1' });
    expect(profile.nerdFont).toBe('yes');
    expect(profile.source).toBe('override');
    expect(profile.app).toBe('apple-terminal'); // app detection still runs
  });

  test('BUNTI_NF=0 forces nerd fonts off, even on Ghostty', () => {
    const profile = identifyTerminal({ ...GHOSTTY_ENV, BUNTI_NF: '0' });
    expect(profile.nerdFont).toBe('no');
    expect(profile.source).toBe('override');
    expect(profile.app).toBe('ghostty');
  });

  test('NERD_FONTS accepts true/false and yes/no forms', () => {
    expect(identifyTerminal({ NERD_FONTS: 'true' }).nerdFont).toBe('yes');
    expect(identifyTerminal({ NERD_FONTS: 'false' }).nerdFont).toBe('no');
    expect(identifyTerminal({ NERD_FONT: 'yes' }).nerdFont).toBe('yes');
    expect(identifyTerminal({ NERD_FONT: 'no' }).nerdFont).toBe('no');
  });

  test('NERD_FONTS wins over BUNTI_NF (legacy precedence preserved)', () => {
    const profile = identifyTerminal({ NERD_FONTS: '0', BUNTI_NF: '1' });
    expect(profile.nerdFont).toBe('no');
  });

  test('unrecognized override values fall through to the env policy', () => {
    const profile = identifyTerminal({
      BUNTI_NF: 'maybe',
      TERM_PROGRAM: 'ghostty',
    });
    expect(profile.nerdFont).toBe('yes');
    expect(profile.source).toBe('env');
  });
});

describe('multiplexer detection', () => {
  test('tmux is recorded while inner app signals still identify the emulator', () => {
    const profile = identifyTerminal({
      TMUX: '/tmp/tmux-501/default,1234,0',
      TERM: 'tmux-256color',
      GHOSTTY_RESOURCES_DIR: '/opt/ghostty',
    });
    expect(profile.multiplexer).toBe('tmux');
    expect(profile.app).toBe('ghostty');
    expect(profile.nerdFont).toBe('yes');
  });

  test('tmux with no surviving signals stays conservative', () => {
    const profile = identifyTerminal({
      TMUX: '/tmp/tmux-501/default,1234,0',
      TERM: 'screen-256color',
    });
    expect(profile.multiplexer).toBe('tmux');
    expect(profile.app).toBe('unknown');
    expect(profile.nerdFont).toBe('assumed-no');
    expect(profile.syncOutput).toBe(false);
  });

  test('TERM=tmux-* implies tmux even without $TMUX', () => {
    expect(identifyTerminal({ TERM: 'tmux-256color' }).multiplexer).toBe(
      'tmux',
    );
  });

  test('GNU screen via STY or TERM', () => {
    expect(
      identifyTerminal({ STY: '1234.pts-0.host', TERM: 'screen' }).multiplexer,
    ).toBe('screen');
    expect(identifyTerminal({ TERM: 'screen-256color' }).multiplexer).toBe(
      'screen',
    );
  });

  test('no multiplexer field on a plain terminal', () => {
    expect(identifyTerminal(GHOSTTY_ENV).multiplexer).toBeUndefined();
  });
});

describe('color tier consults the profile', () => {
  test('TERM=xterm-kitty upgrades to truecolor (was misread as 16-color)', () => {
    expect(detectColorTier({ TERM: 'xterm-kitty' })).toBe('truecolor');
  });

  test('identified truecolor apps upgrade the tier without COLORTERM', () => {
    expect(detectColorTier({ TERM_PROGRAM: 'ghostty', TERM: 'xterm' })).toBe(
      'truecolor',
    );
    expect(
      detectColorTier({ TERM_PROGRAM: 'vscode', TERM: 'xterm-256color' }),
    ).toBe('truecolor');
  });

  test('Apple Terminal stays at 256 colors', () => {
    expect(detectColorTier(APPLE_TERMINAL_ENV)).toBe('256');
  });

  test('NO_COLOR still wins over any app detection', () => {
    expect(detectColorTier({ ...GHOSTTY_ENV, NO_COLOR: '1' })).toBe('mono');
    expect(identifyTerminal({ ...GHOSTTY_ENV, NO_COLOR: '1' }).truecolor).toBe(
      false,
    );
  });
});

describe('detectCapabilities back-compat wrapper', () => {
  test('maps the profile onto the legacy shape', async () => {
    const ghostty = await detectCapabilities(GHOSTTY_ENV);
    expect(ghostty).toEqual({
      nerdFont: true,
      glyphProtocol: true,
      unicode: true,
      color: true,
    });

    const apple = await detectCapabilities(APPLE_TERMINAL_ENV);
    expect(apple.nerdFont).toBe(false);
    expect(apple.glyphProtocol).toBe(false);
    expect(apple.color).toBe(true);
  });
});

describe('icons integration', () => {
  // Restore the module default so later test files see nerd glyphs.
  afterAll(async () => {
    await init({ nerdFont: true });
  });

  test('ghostty profile selects nerd glyphs', async () => {
    await init({ profile: identifyTerminal(GHOSTTY_ENV) });
    expect(icon('rocket')).toBe('');
    expect(icon('branch')).toBe('');
  });

  test('apple-terminal profile falls back to the ascii tier', async () => {
    await init({ profile: identifyTerminal(APPLE_TERMINAL_ENV) });
    expect(icon('rocket')).toBe('R');
    expect(icon('branch')).toBe('*');
  });

  test('assumed-yes policies (kitty) also select nerd glyphs', async () => {
    await init({ profile: identifyTerminal({ TERM: 'xterm-kitty' }) });
    expect(icon('rocket')).toBe('');
  });

  test('explicit init({ nerdFont }) wins over any profile-derived tier', async () => {
    await init({ profile: identifyTerminal(GHOSTTY_ENV) });
    await init({ nerdFont: false });
    expect(icon('rocket')).toBe('R');
  });
});
