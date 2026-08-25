import type { Context, HighlightState } from "./state.ts";
import { ContextKind } from "./state.ts";
import { type Token, TokenType, WHITESPACE } from "./tokens.ts";

export function retroParams(out: Token[], ctx: HighlightState, src: string): void {
  const nameLike = (t: Token): boolean =>
    t.type === TokenType.VARIABLE ||
    t.type === TokenType.CONSTANT ||
    t.type === TokenType.IDENTIFIER ||
    t.type === TokenType.PARAMETER;

  let i = out.length - 1;
  while (i >= 0 && out[i].type === WHITESPACE) i--;
  if (i < 0) return;

  const names: string[] = [];
  const mark = (t: Token): void => {
    t.type = TokenType.PARAMETER;
    names.push(src.slice(t.start, t.end));
  };

  const last = out[i];
  if (nameLike(last)) {
    // Check if this is actually a return type: look ahead for `):` pattern
    // Walk backward past this name to find what precedes it
    let k = i - 1;
    while (k >= 0 && out[k].type === WHITESPACE) k--;
    if (k >= 0 && out[k].type === TokenType.PUNCTUATION && src[out[k].start] === ":") {
      // Pattern: `: Name` — could be return type. Check for `)` before the `:`
      let m = k - 1;
      while (m >= 0 && out[m].type === WHITESPACE) m--;
      if (m >= 0 && out[m].type === TokenType.PUNCTUATION && src[out[m].start] === ")") {
        // This is a return type annotation `): Type`, not a parameter.
        // Skip backward past the type, then process the `)` as closing paren.
        i = m; // point to `)`
        // Now fall through to the `)` handling below
      } else {
        mark(last);
        addParams(ctx, names);
        return;
      }
    } else {
      mark(last);
      addParams(ctx, names);
      return;
    }
  }

  if (last.type !== TokenType.PUNCTUATION || src[last.start] !== ")") return;

  // Skip return-type annotation between ) and =>
  // Walk backward past `: <type>` before collecting params
  let j = i - 1;
  while (j >= 0 && out[j].type === WHITESPACE) j--;
  if (j >= 0 && out[j].type === TokenType.PUNCTUATION && src[out[j].start] === ":") {
    // Skip backward past the type annotation tokens
    j--;
    let depth = 0;
    while (j >= 0) {
      const t = out[j];
      if (t.type === WHITESPACE) {
        j--;
        continue;
      }
      if (t.type === TokenType.PUNCTUATION) {
        const ch = src[t.start];
        if (ch === ">" || ch === "]" || ch === "}") depth++;
        else if (ch === "<" || ch === "[" || ch === "{") {
          if (depth === 0) break;
          depth--;
        } else if (ch === "," || ch === ")") break;
      } else if (nameLike(t) || t.type === TokenType.OPERATOR) {
        // type name or operator like |, &
      }
      j--;
    }
    i = j;
    // Skip whitespace
    while (i >= 0 && out[i].type === WHITESPACE) i--;
    if (i < 0) return;
    // Re-check: we should be at `)` now
    if (out[i].type !== TokenType.PUNCTUATION || src[out[i].start] !== ")") return;
  }

  let depth = 0;
  while (i >= 0) {
    const t = out[i];
    if (t.type === WHITESPACE) {
      i--;
      continue;
    }
    if (t.type === TokenType.PUNCTUATION) {
      const p = src[t.start];
      if (p === ")") {
        depth++;
        i--;
        continue;
      }
      if (p === "(") {
        if (depth === 1) addParams(ctx, names);
        else if (depth > 1) {
          depth--;
          i--;
          continue;
        }
        return;
      }
      if (depth > 0 && p === ",") {
        i--;
        continue;
      }
      return;
    }
    if (depth > 0 && nameLike(t)) {
      mark(t);
      i--;
      continue;
    }
    return;
  }
}

function addParams(ctx: HighlightState, names: string[]): void {
  let target: Context | null = null;
  for (let i = ctx.contexts.length - 1; i >= 0; i--) {
    const c = ctx.contexts[i].kind;
    if (c === ContextKind.FUNCTION || c === ContextKind.CLASS || c === ContextKind.BLOCK) {
      target = ctx.contexts[i];
      break;
    }
  }
  const set = target ? (target.params ??= new Set()) : ctx.globalParams;
  for (const n of names) set.add(n);
}
