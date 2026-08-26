import type { TokenType, WHITESPACE } from "../../core/tokens.ts";

/**
 * ANSI theme — plain RGB data. No ANSI escape codes.
 * Each semantic token type maps to a CSS hex color like "#ff79c6".
 * The renderer converts hex → truecolor SGR `ESC[38;2;R;G;Bm`.
 */
export type AnsiTheme = Partial<Record<TokenType | typeof WHITESPACE | "type", string>>;

export type AnsiThemeName =
  | "dark-plus"
  | "default"
  | "default-light"
  | "dracula"
  | "github"
  | "github-dark"
  | "github-light"
  | "gruvbox-dark"
  | "light-plus"
  | "monokai"
  | "nord"
  | "one-dark"
  | "solarized"
  | "solarized-dark"
  | "solarized-light"
  | "tokyo-night"
  | "vscode-dark"
  | "vscode-light";
