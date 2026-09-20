// Shared token-color theming for the landing showcases.
//
// Generates editor CSS from the library's ANSI hex themes, mirroring
// `src/themes/shared.css` var() fallbacks. ID-scoped so the rules win over
// the landing token styles in both site modes.
import { ANSI_THEMES } from "@opentf/syntax-highlighter";

// All 16 canonical themes; aliases (github, solarized) omitted.
export const THEME_ORDER = [
  "default",
  "dark-plus",
  "default-light",
  "dracula",
  "github-dark",
  "github-light",
  "gruvbox-dark",
  "light-plus",
  "monokai",
  "nord",
  "one-dark",
  "solarized-dark",
  "solarized-light",
  "tokyo-night",
  "vscode-dark",
  "vscode-light",
];

// Editor background follows the theme's intent (validated by verify-themes.mjs).
export const DARK_THEMES = new Set([
  "dark-plus",
  "default",
  "dracula",
  "github-dark",
  "gruvbox-dark",
  "monokai",
  "nord",
  "one-dark",
  "solarized-dark",
  "tokyo-night",
  "vscode-dark",
]);

// Fallback chains mirroring `src/themes/shared.css` var() fallbacks:
// suffix -> [theme keys in priority order]. `inherit` classes keep the
// editor foreground and only add font styling.
export const FALLBACKS = {
  control: ["control", "keyword"],
  method: ["method", "function"],
  key: ["key", "property"],
  tag: ["tag", "keyword"],
  attribute: ["attribute", "property"],
  addition: ["addition", "string"],
  deletion: ["deletion", "comment"],
  hunk: ["hunk", "keyword"],
  header: ["header", "keyword"],
  "code-inline": ["code-inline", "string"],
  "code-block": ["code-block", "string"],
  "markup-heading": ["markup-heading", "keyword"],
  "markup-quote": ["markup-quote", "comment"],
  "markup-list": ["markup-list", "operator"],
  "markup-link": ["markup-link", "keyword"],
  "markup-image": ["markup-image", "keyword"],
  "markup-table": ["markup-table", "property"],
  "markup-task": ["markup-task", "constant"],
  "markup-task-checked": ["markup-task-checked", "string"],
  "markup-task-unchecked": ["markup-task-unchecked", "comment"],
  "markup-footnote": ["markup-footnote", "decorator"],
  "markup-html": ["markup-html", "tag", "keyword"],
  "syntax-delimiter": ["syntax-delimiter", "punctuation"],
  "syntax-marker": ["syntax-marker", "punctuation"],
  "syntax-escape": ["syntax-escape", "variable"],
};

export const FONT_STYLES = {
  "text-bold": "font-weight:bold",
  "text-bold-italic": "font-weight:bold;font-style:italic",
  "text-italic": "font-style:italic",
  "text-underline": "text-decoration:underline",
  "text-strikethrough": "text-decoration:line-through",
  "markup-heading": "font-weight:bold",
  "markup-link": "text-decoration:underline",
};

export function isDarkTheme(name) {
  return DARK_THEMES.has(name);
}

export function themeForeground(theme) {
  return theme.variable ?? theme.identifier ?? "#e2e8f0";
}

// Demo playground chrome (background, gutter, caret, prose foreground)
// for one theme. Token colors come from tokenRules().
export function editorChrome(name) {
  const t = ANSI_THEMES[name] ?? ANSI_THEMES.default;
  const dark = isDarkTheme(name);
  const bg = dark ? "#0d1528" : "#ffffff";
  const gutter = dark ? "#46587e" : "#8b96ab";
  const caret = dark ? "#7dd3fc" : "#2968bd";
  // Plain prose (`text` tokens) must use the theme foreground, never the
  // site body color — otherwise it vanishes on light editor themes.
  const fg = themeForeground(t);
  return (
    `#demo-code{color:${fg}}#demo-code .token.text{color:${fg}}` +
    `.demo-codewrap{background:${bg}}.demo-gutter{background:${bg};color:${gutter}}.demo-input{caret-color:${caret}}`
  );
}

// Token color rules for one theme, scoped to `#${scopeId} .token-*`.
export function tokenRules(name, scopeId) {
  const t = ANSI_THEMES[name] ?? ANSI_THEMES.default;
  const pick = (...keys) => keys.map((k) => t[k]).find((v) => v != null);
  let css = "";
  for (const [k, v] of Object.entries(t)) {
    if (k === "whitespace") continue;
    css += `#${scopeId} .token.${k}{color:${v}}`;
  }
  // Fill theme gaps exactly like shared.css var() fallbacks.
  for (const [suffix, chain] of Object.entries(FALLBACKS)) {
    if (t[suffix] != null) continue;
    const v = pick(...chain);
    if (v == null) continue;
    css += `#${scopeId} .token.${suffix}{color:${v}}`;
  }
  for (const [suffix, style] of Object.entries(FONT_STYLES)) {
    css += `#${scopeId} .token.${suffix}{${style}}`;
  }
  return css;
}
