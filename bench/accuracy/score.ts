/**
 * Character-level highlighting accuracy against a TextMate reference.
 *
 * Both sides are reduced to the same small set of color classes — the
 * categories popular themes color consistently — and compared character by
 * character over all non-whitespace source. Nothing is skipped: unlike a
 * token-boundary comparison, differing token granularity cannot hide a
 * mismatch.
 *
 * Mapping principles:
 * - Ordinary identifiers, parameters, operators, and punctuation are `plain`:
 *   whether a theme tints `const s` or a parameter is a theme choice, not a
 *   tokenizer error.
 * - A reference scope chain is read innermost-first; `meta.*`, `source.*`,
 *   and `text.*` are structural and skipped.
 * - Everything inside a comment is `comment`, including doc tags such as
 *   `@param`: themes disagree on tinting them.
 * - A unit belongs to its number (`1rem` is all `number`).
 * - Delimiters belong to what they delimit (quotes are `string`, a JSON key's
 *   quotes are `property`), so generic punctuation defers to the enclosing
 *   scope; escapes inside strings stay `string`. Interpolation delimiters
 *   (`${`, `}`) are `plain`.
 */

import type { Token } from "../../packages/syntax-highlighter/src/index.ts";

export const COLOR_CLASSES = [
  "plain",
  "comment",
  "string",
  "number",
  "keyword",
  "function",
  "type",
  "constant",
  "tag",
  "attribute",
  "property",
  "inserted",
  "deleted",
  "range",
  "header",
  "heading",
  "emphasis",
  "link",
  "quote",
] as const;

export type ColorClass = (typeof COLOR_CLASSES)[number];

const ALL_CAPS = /^[A-Z][A-Z0-9_]*$/;
const WORD = /^[A-Za-z]+$/;

/** One reference span: text plus its scope chain, outermost first. */
export type ScopedSpan = { start: number; text: string; scopes: string[] };

/** The subset of Shiki's `codeToTokens(…, { includeExplanation: true })` result used here. */
export type ShikiTokensResult = {
  tokens: Array<
    Array<{
      offset: number;
      explanation?: Array<{ content: string; scopes: Array<{ scopeName: string }> }>;
    }>
  >;
};

/** Flatten Shiki's explained tokens into source-offset spans. */
export function spansFromShiki(result: ShikiTokensResult): ScopedSpan[] {
  const spans: ScopedSpan[] = [];
  for (const line of result.tokens) {
    for (const token of line) {
      let start = token.offset;
      for (const part of token.explanation ?? []) {
        spans.push({ start, text: part.content, scopes: part.scopes.map((s) => s.scopeName) });
        start += part.content.length;
      }
    }
  }
  return spans;
}

/**
 * Class for a single scope, or `null` when the scope is structural and the
 * next-outer scope decides.
 */
export function classifyScope(scope: string, text: string): ColorClass | null {
  const s = scope.toLowerCase();
  const has = (prefix: string) => s === prefix || s.startsWith(`${prefix}.`);

  if (has("comment") || has("punctuation.definition.comment")) return "comment";
  if (has("punctuation.definition.template-expression") || has("punctuation.section.embedded"))
    return "plain";
  if (has("constant.character.escape")) return "string";
  if (
    has("string") ||
    has("punctuation.definition.string") ||
    has("markup.inline.raw") ||
    has("markup.raw") ||
    has("markup.fenced_code")
  )
    return "string";
  // A unit belongs to its number (`1rem`, `50%`); themes color them alike.
  if (has("constant.numeric") || has("keyword.other.unit")) return "number";
  if (has("constant.language")) return "constant";
  if (has("variable.other.constant") || has("variable.other.enummember")) {
    return ALL_CAPS.test(text.trim()) ? "constant" : "plain";
  }
  if (has("constant")) return "constant";

  if (has("markup.inserted")) return "inserted";
  if (has("markup.deleted")) return "deleted";
  if (has("meta.diff.range") || has("meta.toc-list.line-number")) return "range";
  if (has("meta.diff.header") || has("meta.diff.index")) return "header";
  if (has("markup.heading") || has("entity.name.section")) return "heading";
  if (has("markup.bold") || has("markup.italic") || has("markup.strikethrough")) return "emphasis";
  if (has("markup.underline.link") || has("string.other.link") || has("markup.link")) return "link";
  if (has("markup.quote")) return "quote";

  if (
    has("entity.name.function") ||
    has("support.function") ||
    has("entity.name.method") ||
    has("meta.function-call.generic") ||
    has("meta.decorator") ||
    has("punctuation.decorator")
  )
    return "function";
  if (
    /(^|\.)property-name(\.|$)/.test(s) ||
    has("variable.other.property") ||
    has("variable.other.object.property") ||
    has("meta.object-literal.key") ||
    has("entity.name.tag.yaml") ||
    has("support.variable.property")
  )
    return "property";
  if (
    has("entity.name.type") ||
    has("entity.name.class") ||
    has("entity.other.inherited-class") ||
    has("support.class") ||
    has("support.type")
  )
    return "type";
  if (has("entity.name.tag")) return "tag";
  if (has("entity.other.attribute-name")) return "attribute";

  if (has("keyword.operator")) return WORD.test(text.trim()) ? "keyword" : "plain";
  if (has("keyword") || has("storage") || has("variable.language")) return "keyword";
  if (has("variable") || has("support.variable")) return "plain";

  return null; // punctuation, meta.*, source.*, text.*, and unknown scopes defer outward
}

/** Class for a reference span: innermost decisive scope wins. */
export function classifyScopes(scopes: string[], text: string): ColorClass {
  if (scopes.some((scope) => /^comment(\.|$)/i.test(scope))) return "comment";
  for (let i = scopes.length - 1; i >= 0; i--) {
    const c = classifyScope(scopes[i], text);
    if (c) return c;
  }
  return "plain";
}

const TYPE_CLASS: Record<string, ColorClass> = {
  comment: "comment",
  string: "string",
  regex: "string",
  number: "number",
  keyword: "keyword",
  control: "keyword",
  function: "function",
  method: "function",
  decorator: "function",
  class: "type",
  constant: "constant",
  boolean: "constant",
  null: "constant",
  tag: "tag",
  attribute: "attribute",
  property: "property",
  key: "property",
  addition: "inserted",
  deletion: "deleted",
  hunk: "range",
  header: "header",
};

const SEMANTIC_CLASS: Record<string, ColorClass> = {
  "markup.heading": "heading",
  "text.bold": "emphasis",
  "text.italic": "emphasis",
  "text.bold-italic": "emphasis",
  "text.strikethrough": "emphasis",
  "markup.link": "link",
  "markup.image": "link",
  "markup.quote": "quote",
  "code.inline": "string",
  "code.block": "string",
};

/** Class for one of our tokens; semantic identity takes precedence. */
export function classifyToken(token: Pick<Token, "type" | "semantic">): ColorClass {
  if (token.semantic && SEMANTIC_CLASS[token.semantic]) return SEMANTIC_CLASS[token.semantic];
  return TYPE_CLASS[token.type] ?? "plain";
}

/** Per-character classes from our tokens (unset positions stay `plain`). */
export function classesFromTokens(length: number, tokens: Token[]): ColorClass[] {
  const out: ColorClass[] = new Array(length).fill("plain");
  for (const t of tokens) {
    const c = classifyToken(t);
    for (let i = Math.max(0, t.start); i < Math.min(length, t.end); i++) out[i] = c;
  }
  return out;
}

/** Per-character classes from reference spans. */
export function classesFromSpans(length: number, spans: ScopedSpan[]): ColorClass[] {
  const out: ColorClass[] = new Array(length).fill("plain");
  for (const span of spans) {
    const c = classifyScopes(span.scopes, span.text);
    const end = Math.min(length, span.start + span.text.length);
    for (let i = Math.max(0, span.start); i < end; i++) out[i] = c;
  }
  return out;
}

export type Score = {
  /** Non-whitespace characters compared. */
  chars: number;
  /** Characters whose classes agree. */
  matched: number;
  /** Characters either side colors (not `plain` on both). */
  highlighted: number;
  /** Highlighted characters whose classes agree. */
  highlightedMatched: number;
  /** Mismatch counts keyed `reference→ours`. */
  confusion: Map<string, { chars: number; examples: string[] }>;
};

export function emptyScore(): Score {
  return { chars: 0, matched: 0, highlighted: 0, highlightedMatched: 0, confusion: new Map() };
}

const MAX_EXAMPLES = 3;

/** Compare per-character classes over the non-whitespace characters of `source`. */
export function compare(source: string, reference: ColorClass[], ours: ColorClass[]): Score {
  const score = emptyScore();
  let i = 0;
  while (i < source.length) {
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }
    const r = reference[i];
    const o = ours[i];
    score.chars++;
    if (r !== "plain" || o !== "plain") score.highlighted++;
    if (r === o) {
      score.matched++;
      if (r !== "plain") score.highlightedMatched++;
      i++;
      continue;
    }
    // Collect the run of identical mismatches as one example.
    let j = i;
    while (j < source.length && reference[j] === r && ours[j] === o && !/\s/.test(source[j])) j++;
    const run = j - i;
    score.chars += run - 1;
    score.highlighted += run - 1;
    const key = `${r}→${o}`;
    const entry = score.confusion.get(key) ?? { chars: 0, examples: [] };
    entry.chars += run;
    const example = source.slice(i, j);
    if (entry.examples.length < MAX_EXAMPLES && !entry.examples.includes(example)) {
      entry.examples.push(example);
    }
    score.confusion.set(key, entry);
    i = j;
  }
  return score;
}

/** Accumulate `b` into `a`. */
export function addScore(a: Score, b: Score): Score {
  a.chars += b.chars;
  a.matched += b.matched;
  a.highlighted += b.highlighted;
  a.highlightedMatched += b.highlightedMatched;
  for (const [key, v] of b.confusion) {
    const entry = a.confusion.get(key) ?? { chars: 0, examples: [] };
    entry.chars += v.chars;
    for (const ex of v.examples) {
      if (entry.examples.length < MAX_EXAMPLES && !entry.examples.includes(ex))
        entry.examples.push(ex);
    }
    a.confusion.set(key, entry);
  }
  return a;
}

/** Percentages, one decimal; 100 when there is nothing to compare. */
export function percentages(s: Score): { overall: number; highlighted: number } {
  const pct = (n: number, d: number) => (d === 0 ? 100 : Math.round((n / d) * 1000) / 10);
  return {
    overall: pct(s.matched, s.chars),
    highlighted: pct(s.highlightedMatched, s.highlighted),
  };
}
