/**
 * YAML structure pass (opt-in via `features.yamlStructure`).
 *
 * YAML meaning comes from line shape, not word lists, so after the generic
 * classifier runs this pass reads each line and retypes the tokens it covers:
 *
 *   `key:`               → property   (`on:` and `yes:` are keys, not booleans)
 *   plain scalar values  → string     (YAML 1.2: only true/false are booleans,
 *                                      null/~ are null, numbers are numbers)
 *   `|` / `>` scalars    → indicator keyword, indented body string
 *   `&anchor` / `!tag`   → keyword (anchor name → class); `*alias` → keyword
 *   `[a, b]` / `{k: v}`  → items string, flow keys property
 *
 * Quoted strings and comments keep their types. Token boundaries never
 * change, so the token contract is preserved.
 */

import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";

const BOOLEAN = /^(?:true|True|TRUE|false|False|FALSE)$/;
const NULL = /^(?:null|Null|NULL|~)$/;
const NUMBER =
  /^[-+]?(?:\d[\d_]*(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|0x[\da-fA-F]+|0o[0-7]+|\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;
const BLOCK_INDICATOR = /^[|>][-+]?\d?[-+]?(?=\s|$)/;

export function applyYamlStructure(tokens: Token[], source: string): void {
  /** Index of the first token ending after `pos` (tokens are sorted, contiguous). */
  const firstAfter = (pos: number) => {
    let lo = 0;
    let hi = tokens.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tokens[mid].end <= pos) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  /** Retype every non-whitespace, non-comment token inside [start, end). */
  const retype = (start: number, end: number, type: Token["type"], keepStrings = false) => {
    for (let i = firstAfter(start); i < tokens.length && tokens[i].start < end; i++) {
      const t = tokens[i];
      if (t.type === WHITESPACE || t.type === TokenType.COMMENT) continue;
      if (keepStrings && t.type === TokenType.STRING) continue;
      tokens[i] = createToken(type, t.start, t.end, t.semantic);
    }
  };

  /** Classify a plain scalar occupying [start, end). */
  const scalar = (start: number, end: number) => {
    const text = source.slice(start, end);
    if (!text) return;
    if (text[0] === '"' || text[0] === "'") return; // quoted: already a string
    if (BOOLEAN.test(text)) retype(start, end, TokenType.BOOLEAN);
    else if (NULL.test(text)) retype(start, end, TokenType.NULL);
    else if (NUMBER.test(text)) retype(start, end, TokenType.NUMBER);
    else retype(start, end, TokenType.STRING);
  };

  /** End of content before a ` #` comment, outside quotes; trailing spaces trimmed. */
  const contentEnd = (from: number, lineEnd: number) => {
    let quote: string | null = null;
    let end = lineEnd;
    for (let i = from; i < lineEnd; i++) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        if (i === from || /[\s:[{,]/.test(source[i - 1])) quote = c;
      } else if (c === "#" && (i === from || /\s/.test(source[i - 1]))) {
        end = i;
        break;
      }
    }
    while (end > from && /\s/.test(source[end - 1])) end--;
    return end;
  };

  /** Position of the mapping `:` in [from, end), or -1. */
  const mappingColon = (from: number, end: number) => {
    if (source[from] === '"' || source[from] === "'") {
      const close = source.indexOf(source[from], from + 1);
      if (close === -1 || close >= end) return -1;
      let i = close + 1;
      while (i < end && (source[i] === " " || source[i] === "\t")) i++;
      return source[i] === ":" && (i + 1 >= end || /\s/.test(source[i + 1])) ? i : -1;
    }
    if ("[{&*!|>".includes(source[from])) return -1;
    for (let i = from; i < end; i++) {
      if (source[i] === ":" && (i + 1 >= end || /\s/.test(source[i + 1]))) return i;
    }
    return -1;
  };

  /** Handle `&anchor`, `*alias`, `!tag` prefixes; returns where the value continues. */
  const properties = (from: number, end: number) => {
    let p = from;
    while (p < end && "&*!".includes(source[p])) {
      let q = p + 1;
      while (q < end && !/[\s,\]}]/.test(source[q])) q++;
      if (source[p] === "&") {
        retype(p, p + 1, TokenType.KEYWORD);
        retype(p + 1, q, TokenType.CLASS);
      } else if (source[p] === "*") {
        retype(p, p + 1, TokenType.KEYWORD); // the alias name itself stays plain
        retype(p + 1, q, TokenType.VARIABLE);
      } else {
        retype(p, q, TokenType.KEYWORD);
      }
      p = q;
      while (p < end && (source[p] === " " || source[p] === "\t")) p++;
    }
    return p;
  };

  /**
   * Flow collection `[…]` / `{…}` content in [from, end), entered at nesting
   * `depth` (> 0 when continuing a collection from an earlier line). Returns
   * the depth at `end`, so a wrapped collection carries over to the next line.
   */
  const flow = (from: number, end: number, depth: number): number => {
    let itemStart = depth > 0 ? from : -1;
    const close = (i: number) => {
      if (itemStart === -1) return;
      let s = itemStart;
      let e = i;
      while (s < e && /\s/.test(source[s])) s++;
      while (e > s && /\s/.test(source[e - 1])) e--;
      if (s < e) {
        const colon = mappingColon(s, e);
        if (colon !== -1) {
          let ke = colon;
          while (ke > s && /\s/.test(source[ke - 1])) ke--;
          retype(s, ke, TokenType.PROPERTY, true);
          let v = colon + 1;
          while (v < e && /\s/.test(source[v])) v++;
          scalar(v, e);
        } else {
          scalar(properties(s, e), e);
        }
      }
      itemStart = -1;
    };
    let quote: string | null = null;
    for (let i = from; i < end; i++) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'") {
        if (itemStart === -1) itemStart = i;
        quote = c;
      } else if (c === "[" || c === "{" || c === "]" || c === "}" || c === ",") {
        close(i);
        if (c === "[" || c === "{") depth++;
        else if (c === "]" || c === "}") depth = Math.max(0, depth - 1);
        if (depth > 0 && c !== "]" && c !== "}") itemStart = i + 1;
        if (depth === 0) return 0; // trailing text after the collection is not flow
      } else if (itemStart === -1) {
        itemStart = i;
      }
    }
    close(end);
    return depth;
  };

  let blockIndent = -1; // indent of the line owning an open block scalar
  let flowDepth = 0; // open `[`/`{` nesting carried over from earlier lines
  let lineStart = 0;
  while (lineStart <= source.length) {
    let lineEnd = source.indexOf("\n", lineStart);
    if (lineEnd === -1) lineEnd = source.length;

    let p = lineStart;
    while (p < lineEnd && (source[p] === " " || source[p] === "\t")) p++;
    const indent = p - lineStart;
    const blank = p >= lineEnd || source[p] === "\r";

    if (blockIndent >= 0) {
      if (blank || indent > blockIndent) {
        if (!blank) retype(p, lineEnd, TokenType.STRING);
        lineStart = lineEnd + 1;
        continue;
      }
      blockIndent = -1;
    }

    const end = blank ? p : contentEnd(p, lineEnd);
    if (flowDepth > 0) {
      if (p < end) flowDepth = flow(p, end, flowDepth);
      lineStart = lineEnd + 1;
      continue;
    }
    const marker = source.slice(p, p + 3);
    if (
      p < end &&
      !((marker === "---" || marker === "...") && (p + 3 >= end || /\s/.test(source[p + 3])))
    ) {
      // Sequence entries: `- `, possibly nested (`- - a`).
      while (p < end && source[p] === "-" && (p + 1 >= end || /\s/.test(source[p + 1]))) {
        p += 1;
        while (p < end && /\s/.test(source[p])) p++;
      }
      // Directives (`%YAML 1.2`) stay as lexed.
      if (p < end && source[p] !== "%") {
        // A node property may precede a key: `&base name: value`.
        if (source[p] === "&" || source[p] === "!") p = properties(p, end);
        const colon = mappingColon(p, end);
        let value = p;
        if (colon !== -1) {
          let keyEnd = colon;
          while (keyEnd > p && /\s/.test(source[keyEnd - 1])) keyEnd--;
          // `<<` is the merge key, a constant rather than a name.
          const key = source.slice(p, keyEnd) === "<<" ? TokenType.CONSTANT : TokenType.PROPERTY;
          retype(p, keyEnd, key, true);
          value = colon + 1;
          while (value < end && /\s/.test(source[value])) value++;
        }
        if (value < end) {
          value = properties(value, end);
          const block = BLOCK_INDICATOR.exec(source.slice(value, end));
          if (block) {
            retype(value, value + block[0].length, TokenType.KEYWORD);
            blockIndent = indent;
          } else if (source[value] === "[" || source[value] === "{") {
            flowDepth = flow(value, end, 0);
          } else if (value < end) {
            scalar(value, end);
          }
        }
      }
    }
    lineStart = lineEnd + 1;
  }
}
