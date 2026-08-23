import { type Token, TokenType, WHITESPACE } from "./tokens.ts";

const HIGHLIGHTABLE = new Set<string>(Object.values(TokenType));

export interface HtmlRendererOptions {
  /** CSS class prefix for token spans. Defaults to `sh-`. */
  prefix?: string;
  /** Whether to wrap whitespace tokens. Defaults to false (whitespace is emitted plain). */
  wrapWhitespace?: boolean;
  /** Optional class for the outer `<pre>` when using `renderDocument`. */
  containerClass?: string;
}

const DEFAULT_PREFIX = "sh-";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidToken(token: unknown): token is Token {
  if (token == null || typeof token !== "object") return false;
  const t = token as Record<string, unknown>;
  return (
    typeof t.start === "number" &&
    typeof t.end === "number" &&
    typeof t.type === "string" &&
    Number.isInteger(t.start) &&
    Number.isInteger(t.end)
  );
}

/**
 * HTML renderer — SSR / static / docs.
 *
 * Pure, renderer-agnostic: takes `source` and `tokens` separately, recovers
 * text with `source.slice(token.start, token.end)` and emits escaped HTML
 * with semantic `<span class="sh-{type}">` wrappers. No DOM, no `Range`,
 * no theme coupling.
 */
export function renderHTML(
  source: string,
  tokens: Token[],
  options: HtmlRendererOptions = {},
): string {
  if (typeof source !== "string") throw new TypeError("source must be a string");
  if (!Array.isArray(tokens)) throw new TypeError("tokens must be an array");

  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const wrapWhitespace = options.wrapWhitespace ?? false;

  // Lenient: tolerate unsorted tokens by sorting; fill gaps with plain text.
  const sorted = [...tokens].filter(isValidToken).sort((a, b) => a.start - b.start);

  let html = "";
  let pos = 0;

  for (const token of sorted) {
    if (token.start < 0 || token.end > source.length || token.end <= token.start) continue;
    if (token.start < pos) continue; // overlapping — skip stale

    // gap before token (uncovered source)
    if (token.start > pos) {
      html += escapeHtml(source.slice(pos, token.start));
      pos = token.start;
    }

    const text = source.slice(token.start, token.end);
    const escaped = escapeHtml(text);

    if (token.type === WHITESPACE) {
      html += wrapWhitespace ? `<span class="${prefix}${token.type}">${escaped}</span>` : escaped;
    } else if (HIGHLIGHTABLE.has(token.type)) {
      html += `<span class="${prefix}${token.type}">${escaped}</span>`;
    } else {
      html += escaped;
    }
    pos = token.end;
  }

  if (pos < source.length) {
    html += escapeHtml(source.slice(pos));
  }

  return html;
}

/**
 * Wrap rendered HTML in a `<pre><code>` block suitable for static docs.
 */
export function renderDocument(
  source: string,
  tokens: Token[],
  options: HtmlRendererOptions = {},
): string {
  const inner = renderHTML(source, tokens, options);
  const cls = options.containerClass ? ` class="${escapeHtml(options.containerClass)}"` : "";
  return `<pre${cls}><code>${inner}</code></pre>`;
}

export class HtmlRenderer {
  readonly prefix: string;
  readonly wrapWhitespace: boolean;
  readonly containerClass?: string;

  constructor(options: HtmlRendererOptions = {}) {
    this.prefix = options.prefix ?? DEFAULT_PREFIX;
    this.wrapWhitespace = options.wrapWhitespace ?? false;
    this.containerClass = options.containerClass;
  }

  render(source: string, tokens: Token[]): string {
    return renderHTML(source, tokens, {
      prefix: this.prefix,
      wrapWhitespace: this.wrapWhitespace,
      containerClass: this.containerClass,
    });
  }

  renderDocument(source: string, tokens: Token[]): string {
    return renderDocument(source, tokens, {
      prefix: this.prefix,
      wrapWhitespace: this.wrapWhitespace,
      containerClass: this.containerClass,
    });
  }
}
