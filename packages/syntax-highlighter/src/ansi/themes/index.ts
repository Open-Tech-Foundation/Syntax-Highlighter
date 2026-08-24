export { defaultTheme } from "./default.ts";
export { defaultLight } from "./default-light.ts";
export { dracula } from "./dracula.ts";
// Aliases
export { githubDark, githubDark as github } from "./github-dark.ts";
export { githubLight } from "./github-light.ts";
export { gruvboxDark } from "./gruvbox-dark.ts";
export { monokai } from "./monokai.ts";
export { nord } from "./nord.ts";
export { oneDark } from "./one-dark.ts";
export { solarizedDark, solarizedDark as solarized } from "./solarized-dark.ts";
export { solarizedLight } from "./solarized-light.ts";
export { tokyoNight } from "./tokyo-night.ts";
export type { AnsiTheme, AnsiThemeName } from "./types.ts";

import { defaultTheme } from "./default.ts";
import { defaultLight } from "./default-light.ts";
import { dracula } from "./dracula.ts";
import { githubDark } from "./github-dark.ts";
import { githubLight } from "./github-light.ts";
import { gruvboxDark } from "./gruvbox-dark.ts";
import { monokai } from "./monokai.ts";
import { nord } from "./nord.ts";
import { oneDark } from "./one-dark.ts";
import { solarizedDark } from "./solarized-dark.ts";
import { solarizedLight } from "./solarized-light.ts";
import { tokyoNight } from "./tokyo-night.ts";
import type { AnsiTheme } from "./types.ts";

/**
 * All ANSI themes keyed by name — mirrors CSS themes in `src/themes/`.
 * Themes are plain RGB objects; renderer converts to truecolor SGR.
 */
export const ANSI_THEMES: Record<string, AnsiTheme> = {
  default: defaultTheme,
  "default-light": defaultLight,
  dracula,
  "github-dark": githubDark,
  "github-light": githubLight,
  "gruvbox-dark": gruvboxDark,
  monokai,
  nord,
  "one-dark": oneDark,
  "solarized-dark": solarizedDark,
  "solarized-light": solarizedLight,
  "tokyo-night": tokyoNight,
  // aliases
  github: githubDark,
  solarized: solarizedDark,
};

/**
 * Minimal dark/light palettes for auto light/dark switching.
 * `dark` matches default dark (one-dark-ish), `light` matches default light.
 */
export const ANSI_PALETTES: { dark: AnsiTheme; light: AnsiTheme } = {
  dark: defaultTheme,
  light: defaultLight,
};
