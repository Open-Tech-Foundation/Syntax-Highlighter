/**
 * Page-level helpers: highlight every code block in a document (the Prism
 * `highlightAll` use case) and turn a code string into HTML on the server
 * (the build-time use case). Both treat an unknown language as plain text
 * instead of throwing, since one unusual fence should not break a page.
 */

import { CSSHighlightRenderer } from "./css-renderer.ts";
import { Highlighter } from "./highlighter.ts";
import { escapeHtml, renderHTML } from "./html-renderer.ts";
import type { LanguageDefinition } from "./lexer.ts";
import { loadLanguage, UnknownLanguageError } from "./registry.ts";

/**
 * How `highlightAll` paints a block — the caller decides:
 * - `"highlight"`: CSS Custom Highlight API; the DOM is left untouched.
 *   Paints nothing where the API is unsupported (see `supportsHighlightAPI`).
 * - `"html"`: replaces the block's content with escaped `<span>` markup,
 *   which works in every browser.
 */
export type HighlightMode = "highlight" | "html";

/**
 * Prism's default selector: a `language-*`/`lang-*` class on the `<code>` or
 * on an ancestor such as the `<pre>`.
 */
export const DEFAULT_SELECTOR =
  'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code';

const LANGUAGE_CLASS = /(?:^|\s)(?:language|lang)-(\S+)/i;

export interface HighlightAllOptions {
  /** Required: how blocks are painted. */
  mode: HighlightMode;
  /** Where to look. Defaults to `document`. */
  root?: ParentNode;
  /** Which elements to highlight. Defaults to {@link DEFAULT_SELECTOR}. */
  selector?: string;
  /** Language for matched elements that declare none; otherwise they are skipped. */
  defaultLanguage?: string;
  /** Class prefix for `"html"` mode spans. Defaults to `sh-`. */
  prefix?: string;
}

export interface SkippedBlock {
  element: Element;
  /** The declared language, or `null` when the element declared none. */
  language: string | null;
  reason: "no-language" | "unknown-language";
}

export interface HighlightAllResult {
  highlighted: Element[];
  skipped: SkippedBlock[];
  /** Release `"highlight"`-mode ranges for these blocks (no-op for `"html"`). */
  dispose(): void;
}

export interface HighlightCodeOptions {
  /** Language name or alias. Missing or unknown → escaped plain text. */
  language?: string;
  /** Class prefix for spans. Defaults to `sh-`. */
  prefix?: string;
}

export interface HighlightCodeResult {
  /** Escaped HTML: `<span class="sh-…">` runs, or plain escaped text. */
  html: string;
  /** The canonical language used, or `null` when the code was not highlighted. */
  language: string | null;
}

/** Whether this environment supports the CSS Custom Highlight API. */
export function supportsHighlightAPI(): boolean {
  return (
    typeof CSS !== "undefined" &&
    !!(CSS as { highlights?: unknown }).highlights &&
    typeof (globalThis as { Highlight?: unknown }).Highlight !== "undefined"
  );
}

/** The `language-*` / `lang-*` class on `element` or its nearest ancestor. */
export function languageOf(element: Element): string | null {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const match = LANGUAGE_CLASS.exec(el.getAttribute("class") ?? "");
    if (match) return match[1].toLowerCase();
  }
  return null;
}

// Keyed by definition object, so re-registering a language is picked up.
const highlighters = new WeakMap<LanguageDefinition, Highlighter>();

async function highlighterFor(language: string): Promise<Highlighter | null> {
  let definition: LanguageDefinition;
  try {
    definition = await loadLanguage(language);
  } catch (error) {
    if (error instanceof UnknownLanguageError) return null;
    throw error;
  }
  let highlighter = highlighters.get(definition);
  if (!highlighter) {
    highlighter = new Highlighter(definition);
    highlighters.set(definition, highlighter);
  }
  return highlighter;
}

/** One live renderer per element, so re-highlighting replaces rather than stacks. */
const renderers = new WeakMap<Element, CSSHighlightRenderer>();

/**
 * Highlight every matching code block under `root`. Languages load in
 * parallel; blocks with no or an unknown language are left as they are and
 * reported in `skipped`.
 */
export async function highlightAll(options: HighlightAllOptions): Promise<HighlightAllResult> {
  const mode = options?.mode;
  if (mode !== "highlight" && mode !== "html") {
    throw new TypeError('highlightAll requires options.mode: "highlight" or "html"');
  }
  const root: ParentNode = options.root ?? document;
  const elements = [...root.querySelectorAll(options.selector ?? DEFAULT_SELECTOR)];

  const languageByElement = new Map<Element, string | null>();
  for (const element of elements) {
    languageByElement.set(element, languageOf(element) ?? options.defaultLanguage ?? null);
  }
  const names = new Set([...languageByElement.values()].filter((l) => l !== null));
  const loaded = new Map<string, Highlighter | null>();
  await Promise.all(
    [...names].map(async (name) => loaded.set(name, await highlighterFor(name as string))),
  );

  const highlighted: Element[] = [];
  const skipped: SkippedBlock[] = [];
  const live: CSSHighlightRenderer[] = [];
  for (const element of elements) {
    const language = languageByElement.get(element) ?? null;
    if (language === null) {
      skipped.push({ element, language, reason: "no-language" });
      continue;
    }
    const highlighter = loaded.get(language);
    if (!highlighter) {
      skipped.push({ element, language, reason: "unknown-language" });
      continue;
    }
    const source = element.textContent ?? "";
    const tokens = highlighter.highlight(source);
    if (mode === "html") {
      renderers.get(element)?.dispose();
      renderers.delete(element);
      element.innerHTML = renderHTML(source, tokens, { prefix: options.prefix });
    } else {
      let renderer = renderers.get(element);
      if (!renderer) {
        renderer = new CSSHighlightRenderer(element as HTMLElement);
        renderers.set(element, renderer);
      }
      renderer.render(source, tokens);
      live.push(renderer);
    }
    highlighted.push(element);
  }

  return {
    highlighted,
    skipped,
    dispose() {
      for (const renderer of live) renderer.dispose();
      for (const element of highlighted) renderers.delete(element);
    },
  };
}

/**
 * Highlight `code` to an HTML string — for server rendering and build steps.
 * Never throws for an unknown or missing language: the result is the escaped
 * code with `language: null`, so callers can still wrap it in `<pre><code>`.
 */
export async function highlightCode(
  code: string,
  options: HighlightCodeOptions = {},
): Promise<HighlightCodeResult> {
  if (typeof code !== "string") throw new TypeError("code must be a string");
  const highlighter = options.language ? await highlighterFor(options.language) : null;
  if (!highlighter) return { html: escapeHtml(code), language: null };
  return {
    html: renderHTML(code, highlighter.highlight(code), { prefix: options.prefix }),
    language: highlighter.language.name,
  };
}
