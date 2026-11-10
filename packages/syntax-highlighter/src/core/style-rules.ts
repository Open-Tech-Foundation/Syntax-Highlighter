/**
 * Style-sheet structure pass (opt-in via `features.styleSheet`).
 *
 * CSS is classified by statement shape rather than by word lists: a run of
 * tokens ending in `{` is a selector (or at-rule prelude), one ending in `;`
 * or `}` is a declaration. The pass rewrites token types in place after the
 * generic classifier has run:
 *
 *   selector     `div` `*` `&` → tag;  `.a` `#b` `:hover` `::x` `[attr]` → attribute
 *   declaration  `color:` → property (`--custom:` stays variable);
 *                `#fff` → constant; `!important` → keyword
 *   at-rule      `@media` → keyword; `(max-width:` → property; `and` → keyword
 *
 * Token boundaries never change, so the token contract is preserved.
 */

import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";

type BlockKind = "rules" | "declarations" | "keyframes";

/** At-rules whose block contains declarations rather than nested rules. */
const DECLARATION_AT_RULES = new Set([
  "font-face",
  "page",
  "property",
  "counter-style",
  "font-feature-values",
  "viewport",
]);

const MEDIA_WORD_OPERATORS = new Set(["and", "not", "only", "or"]);

export function applyStyleRules(tokens: Token[], source: string): void {
  const sig: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== WHITESPACE && t.type !== TokenType.COMMENT) sig.push(i);
  }
  const text = (i: number) => source.slice(tokens[i].start, tokens[i].end);
  const set = (i: number, type: Token["type"]) => {
    const t = tokens[i];
    tokens[i] = createToken(type, t.start, t.end, t.semantic);
  };
  /** Whether sig[k] and sig[k + 1] touch, with nothing between them. */
  const adjacent = (k: number) =>
    k + 1 < sig.length && tokens[sig[k]].end === tokens[sig[k + 1]].start;

  const stack: BlockKind[] = [];
  let p = 0;
  while (p < sig.length) {
    // Find the statement terminator at bracket depth 0.
    let e = p;
    let depth = 0;
    for (; e < sig.length; e++) {
      const v = text(sig[e]);
      if (v === "(" || v === "[") depth++;
      else if ((v === ")" || v === "]") && depth > 0) depth--;
      else if (depth === 0 && (v === "{" || v === ";" || v === "}")) break;
    }
    const terminator = e < sig.length ? text(sig[e]) : null;
    const parent = stack[stack.length - 1] ?? "rules";

    if (p < e) {
      const first = text(sig[p]);
      if (first.startsWith("@")) {
        const name = classifyAtRule(p, e);
        if (terminator === "{") {
          stack.push(
            name.endsWith("keyframes")
              ? "keyframes"
              : DECLARATION_AT_RULES.has(name)
                ? "declarations"
                : "rules",
          );
        }
      } else if (terminator === "{") {
        if (parent !== "keyframes") classifySelector(p, e);
        stack.push("declarations");
      } else if (parent === "declarations" || hasColon(p, e)) {
        classifyDeclaration(p, e);
      }
    } else if (terminator === "{") {
      stack.push("declarations");
    }

    if (terminator === "}") stack.pop();
    p = e + 1;
  }

  function hasColon(from: number, to: number): boolean {
    for (let k = from; k < to; k++) if (text(sig[k]) === ":") return true;
    return false;
  }

  function classifyAtRule(from: number, to: number): string {
    set(sig[from], TokenType.KEYWORD);
    const name = text(sig[from]).slice(1).toLowerCase();
    let depth = 0;
    for (let k = from + 1; k < to; k++) {
      const i = sig[k];
      const v = text(i);
      if (v === "(") depth++;
      else if (v === ")") depth = Math.max(0, depth - 1);
      else if (depth > 0 && isWord(i) && k + 1 < to && text(sig[k + 1]) === ":") {
        set(i, TokenType.PROPERTY); // media feature: (max-width: …)
      } else if (MEDIA_WORD_OPERATORS.has(v.toLowerCase()) && isWord(i)) {
        set(i, TokenType.KEYWORD);
      }
    }
    return name;
  }

  function classifySelector(from: number, to: number): void {
    let inAttribute = false;
    let attributeNamed = false;
    for (let k = from; k < to; k++) {
      const i = sig[k];
      const v = text(i);
      if (inAttribute) {
        if (v === "]") inAttribute = false;
        else if (isWord(i)) {
          set(i, attributeNamed ? TokenType.STRING : TokenType.ATTRIBUTE);
          attributeNamed = true;
        }
        continue;
      }
      if (v === "[") {
        inAttribute = true;
        attributeNamed = false;
        continue;
      }
      if ((v === "." || v === ":" || v === "::") && adjacent(k) && isWord(sig[k + 1])) {
        // `.class`, `:hover`, `::before` — the delimiter belongs to the name.
        set(i, TokenType.ATTRIBUTE);
        set(sig[k + 1], TokenType.ATTRIBUTE);
        k++;
        continue;
      }
      if (v === "#" && adjacent(k)) {
        set(i, TokenType.ATTRIBUTE);
        set(sig[k + 1], TokenType.ATTRIBUTE);
        k++;
        continue;
      }
      if (v.startsWith("#") && v.length > 1) {
        set(i, TokenType.ATTRIBUTE); // `#fade` lexed as a hex color
        continue;
      }
      if (v === "*" || v === "&") {
        set(i, TokenType.TAG);
        continue;
      }
      if (isWord(i)) set(i, TokenType.TAG);
    }
  }

  function classifyDeclaration(from: number, to: number): void {
    let colon = -1;
    for (let k = from; k < to; k++) {
      if (text(sig[k]) === ":") {
        colon = k;
        break;
      }
    }
    if (colon === -1) return;
    for (let k = from; k < colon; k++) {
      const i = sig[k];
      if (isWord(i)) set(i, text(i).startsWith("--") ? TokenType.VARIABLE : TokenType.PROPERTY);
    }
    for (let k = colon + 1; k < to; k++) {
      const i = sig[k];
      const v = text(i);
      if (v.startsWith("#") && v.length > 1) set(i, TokenType.CONSTANT);
      else if (v === "#" && adjacent(k)) {
        set(i, TokenType.CONSTANT);
        set(sig[k + 1], TokenType.CONSTANT);
        k++;
      } else if (v === "!" && adjacent(k) && text(sig[k + 1]).toLowerCase() === "important") {
        set(i, TokenType.KEYWORD);
        set(sig[k + 1], TokenType.KEYWORD);
        k++;
      } else if (isWord(i) && !(k + 1 < to && text(sig[k + 1]) === "(")) {
        // Plain value words (`flex`, `red`): never keywords or properties.
        set(i, TokenType.VARIABLE);
      }
    }
  }

  function isWord(i: number): boolean {
    const type = tokens[i].type;
    if (
      type === TokenType.STRING ||
      type === TokenType.NUMBER ||
      type === TokenType.PUNCTUATION ||
      type === TokenType.OPERATOR
    )
      return false;
    return /^-?-?[A-Za-z_\\]/.test(text(i));
  }
}
