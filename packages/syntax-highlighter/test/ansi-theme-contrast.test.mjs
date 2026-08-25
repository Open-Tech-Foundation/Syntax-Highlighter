import { assert, test } from "runtime:test";
import { ANSI_THEMES } from "../src/ansi/themes/index.ts";
import { hexToAnsi } from "../src/core/ansi-renderer.ts";
import { contrast } from "./helpers/wcag.mjs";

/**
 * Contrast gate for the built-in ANSI themes.
 *
 * Each theme is paired with the canonical background of the editor theme it
 * mirrors (the CSS themes define only `--sh-*` token colors, not a terminal
 * background). Policy:
 *
 *   1. Universal visibility floor — every token color must reach 2:1 against
 *      its background. This is the "not invisible" bar; the original
 *      dark-only palette scored 1.61 for variables on light backgrounds.
 *   2. AA-Large floor (3:1) — required for every non-comment token. New
 *      colors must meet it or consciously join SUB_AA_ALLOWLIST.
 *   3. Comments are intentionally muted, so they are exempted from the 3:1
 *      floor but still bound by the universal 2:1 floor.
 */
const THEME_BACKGROUND = {
  default: "#1e1e1e",
  "default-light": "#ffffff",
  dracula: "#282a36",
  github: "#0d1117",
  "github-dark": "#0d1117",
  "github-light": "#ffffff",
  "gruvbox-dark": "#282828",
  monokai: "#272822",
  nord: "#2e3440",
  "one-dark": "#282c34",
  solarized: "#002b36",
  "solarized-dark": "#002b36",
  "solarized-light": "#fdf6e3",
  "tokyo-night": "#1a1b26",
  "vscode-dark": "#1e1e1e",
  "vscode-light": "#ffffff",
};

/**
 * Authentic theme colors that sit below the 3:1 AA-Large floor on their
 * own background. Keyed "<theme>/<token>" with the measured ratio at the
 * time of allowlisting; entries may be removed by brightening the color.
 */
const SUB_AA_ALLOWLIST = {
  "solarized-light/string": 2.93,
  "solarized-light/regex": 2.93,
  "solarized-light/keyword": 2.97,
  "solarized-light/operator": 2.97,
  "solarized-light/class": 2.97,
  "solarized-light/control": 2.97,
};

test("every ANSI theme has a paired background", () => {
  for (const name of Object.keys(ANSI_THEMES)) {
    assert(name in THEME_BACKGROUND, `ANSI theme "${name}" has no THEME_BACKGROUND entry`);
  }
});

test("every theme color is valid hex and converts to an SGR sequence", () => {
  for (const [name, theme] of Object.entries(ANSI_THEMES)) {
    for (const [type, value] of Object.entries(theme)) {
      if (type === "type") continue;
      assert(
        typeof value === "string" && hexToAnsi(value) !== "",
        `${name}/${type}: ${JSON.stringify(value)} is not a convertible hex color`,
      );
    }
  }
});

test("no token color is invisible against its theme background (>= 2:1)", () => {
  const failures = [];
  for (const [name, theme] of Object.entries(ANSI_THEMES)) {
    const bg = THEME_BACKGROUND[name];
    for (const [type, value] of Object.entries(theme)) {
      if (type === "type") continue;
      const ratio = contrast(value, bg);
      if (ratio < 2) failures.push(`${name}/${type}: ${value} on ${bg} = ${ratio}`);
    }
  }
  assert(failures.length === 0, `colors below the visibility floor:\n${failures.join("\n")}`);
});

test("non-comment tokens meet WCAG AA-Large (3:1) or are allowlisted", () => {
  const failures = [];
  const usedAllowlist = new Set();
  for (const [name, theme] of Object.entries(ANSI_THEMES)) {
    const bg = THEME_BACKGROUND[name];
    for (const [type, value] of Object.entries(theme)) {
      if (type === "type" || type === "comment") continue;
      const key = `${name}/${type}`;
      const ratio = contrast(value, bg);
      if (ratio >= 3) continue;
      if (key in SUB_AA_ALLOWLIST) {
        usedAllowlist.add(key);
        continue;
      }
      failures.push(`${key}: ${value} on ${bg} = ${ratio} (allowlist or brighten)`);
    }
  }
  assert(failures.length === 0, `non-comment tokens below 3:1:\n${failures.join("\n")}`);
  const stale = Object.keys(SUB_AA_ALLOWLIST).filter((k) => !usedAllowlist.has(k));
  assert(
    stale.length === 0,
    `stale allowlist entries (now pass 3:1, remove them): ${stale.join(", ")}`,
  );
});

test("comment tokens stay above the muted-but-readable floor (2:1)", () => {
  const failures = [];
  for (const [name, theme] of Object.entries(ANSI_THEMES)) {
    const bg = THEME_BACKGROUND[name];
    const comment = theme.comment;
    if (comment == null) continue;
    const ratio = contrast(comment, bg);
    if (ratio < 2) failures.push(`${name}/comment: ${comment} on ${bg} = ${ratio}`);
  }
  assert(failures.length === 0, `comments below 2:1:\n${failures.join("\n")}`);
});
