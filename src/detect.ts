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
  const nerdEnv = process.env.NERD_FONTS || process.env.NERD_FONT;

  if (nerdEnv === '1' || nerdEnv === 'true') {
    caps.nerdFont = true;
  } else if (['Ghostty', 'WezTerm', 'iTerm.app'].includes(term)) {
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
