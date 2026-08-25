import type { Context, HighlightState } from "./state.ts";
import { ContextKind } from "./state.ts";
import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";

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
    mark(last);
    addParams(ctx, names);
    return;
  }

  if (last.type !== TokenType.PUNCTUATION || src[last.start] !== ")") return;

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
