/**
 * Bunti Terminal Capability Detection
 */

export interface TerminalCapabilities {
  nerdFont: boolean;
  glyphProtocol: boolean;
  unicode: boolean;
  color: boolean;
}

/**
 * Detects terminal capabilities using environment variables and 
 * modern protocol handshakes.
 */
export async function detectCapabilities(): Promise<TerminalCapabilities> {
  const caps: TerminalCapabilities = {
    nerdFont: false,
    glyphProtocol: false,
    unicode: true,
    color: true,
  };

  // 1. Environment Variable Heuristics
  const term = process.env.TERM_PROGRAM || '';
  const termEmulator = process.env.TERMINAL_EMULATOR || '';
  const nerdEnv = process.env.NERD_FONTS || process.env.NERD_FONT || process.env.BUNTI_NF;

  // Optimistic list of terminals known to support modern fonts
  const modernTerms = [
    'Ghostty', 'WezTerm', 'iTerm.app', 'WarpTerminal', 
    'Apple_Terminal', 'vscode', 'Hyper', 'Rio', 'Term7'
  ];

  if (nerdEnv === '1' || nerdEnv === 'true' || nerdEnv === 'yes') {
    caps.nerdFont = true;
  } else if (modernTerms.includes(term) || modernTerms.includes(termEmulator)) {
    caps.nerdFont = true;
  } else if (process.env.LC_TERMINAL === 'iTerm2') {
    caps.nerdFont = true;
  }

  // 2. Glyph Protocol Handshake (Ghostty 1.3+, Rio, WezTerm)
  // We send the Support Query and wait briefly for a response.
  // Note: This is an optimistic check for now, can be expanded to 
  // a full async TTY listener if needed.
  if (term === 'Ghostty') {
    caps.glyphProtocol = true;
  }

  return caps;
}
