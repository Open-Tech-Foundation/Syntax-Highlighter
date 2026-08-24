import { defaultTheme } from "../ansi/themes/default.ts";
import { defaultLight } from "../ansi/themes/default-light.ts";
import { ANSI_PALETTES, ANSI_THEMES } from "../ansi/themes/index.ts";
import type { AnsiTheme } from "../ansi/themes/types.ts";
import { HIGHLIGHTABLE, iterateTokens } from "./render-helpers.ts";
import { type Token, WHITESPACE } from "./tokens.ts";

export const ANSI_RESET = "\x1b[0m";

export type { AnsiTheme };
export { ANSI_PALETTES, ANSI_THEMES, defaultLight, defaultTheme };

/**
 * Convert hex color "#rrggbb" or "#rgb" to truecolor ANSI SGR.
 */
export function hexToAnsi(hex: string): string {
  if (typeof hex !== "string") return "";
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

function themeValueToAnsi(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  if (value.startsWith("\x1b[")) return value;
  if (value.startsWith("#")) return hexToAnsi(value);
  return value;
}

function shouldUseColor(explicit: boolean | undefined): boolean {
  if (explicit === false) return false;
  if (explicit === true) return true;
  try {
    const env = (
      globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (env != null && "NO_COLOR" in env) return false;
  } catch {}
  return true;
}

export interface AnsiRenderOptions {
  /** RGB theme: plain hex colors per token type. Defaults to `defaultTheme` (truecolor). */
  theme?: AnsiTheme;
  /** Explicitly enable/disable color. `false` disables even if theme is provided. Respects `NO_COLOR`. */
  color?: boolean;
  /** Whether to wrap whitespace tokens with ANSI codes. Defaults to false. */
  wrapWhitespace?: boolean;
}

/**
 * ANSI renderer — terminal / CLI. Truecolor-only.
 *
 * Pure, renderer-agnostic: takes `source` and `tokens` separately, recovers
 * text with `source.slice(token.start, token.end)` and emits ANSI-escaped
 * strings with semantic colors. No DOM, no Range, no theme coupling.
 *
 * Themes are plain RGB data (e.g. `{ keyword: "#ff79c6" }`); this renderer
 * converts hex → `ESC[38;2;R;G;Bm` truecolor.
 */
export function renderANSI(
  source: string,
  tokens: Token[],
  options: AnsiRenderOptions = {},
): string {
  if (typeof source !== "string") throw new TypeError("source must be a string");
  if (!Array.isArray(tokens)) throw new TypeError("tokens must be an array");

  const useColor = shouldUseColor(options.color);
  if (!useColor) {
    let plain = "";
    for (const item of iterateTokens(source, tokens)) plain += item.text;
    return plain;
  }

  const rawTheme: AnsiTheme = { ...defaultTheme, ...(options.theme ?? {}) };
  if (options.theme?.type != null && options.theme?.class == null)
    rawTheme.class = options.theme.type as string;

  const colors: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(rawTheme)) {
    if (v != null) colors[k] = themeValueToAnsi(v as string);
  }

  const wrapWhitespace = options.wrapWhitespace ?? false;

  let out = "";
  for (const item of iterateTokens(source, tokens)) {
    if (item.kind === "gap") {
      out += item.text;
    } else {
      const token = item.token;
      const text = item.text;
      if (token.type === WHITESPACE) {
        if (wrapWhitespace && colors[WHITESPACE]) {
          out += `${colors[WHITESPACE]}${text}${ANSI_RESET}`;
        } else {
          out += text;
        }
      } else if (HIGHLIGHTABLE.has(token.type)) {
        const color = colors[token.type];
        out += color ? `${color}${text}${ANSI_RESET}` : text;
      } else {
        out += text;
      }
    }
  }

  return out;
}
