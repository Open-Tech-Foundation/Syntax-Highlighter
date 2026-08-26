import {
  type Context,
  ContextKind,
  createContext,
  type Expectation,
  type HighlightState,
} from "./state.ts";
import { type Token, TokenType } from "./tokens.ts";

const OBJECT_STARTERS = new Set([
  "return",
  "throw",
  "case",
  "typeof",
  "void",
  "delete",
  "in",
  "of",
  "yield",
  "await",
  "default",
  "const",
  "let",
  "var",
]);

export function setKeywordState(
  val: string,
  ctx: HighlightState,
  declarationKeywords: Record<string, string>,
): void {
  const expectation = declarationKeywords[val];
  if (expectation) {
    ctx.expectation = expectation as Expectation;
  } else if (val === "import") {
    ctx.contexts.push(createContext(ContextKind.IMPORT));
    ctx.expectation = null;
  } else if (val === "export") {
    ctx.contexts.push(createContext(ContextKind.EXPORT));
    ctx.expectation = null;
  } else {
    ctx.expectation = null;
  }
}

export function braceKind(
  ctx: HighlightState,
  prev: Token | null,
  prevValue: string | null,
): ContextKind {
  if (ctx.afterArrow) {
    ctx.afterArrow = false;
    return ContextKind.FUNCTION;
  }
  if (ctx.afterTypeDecl) {
    ctx.afterTypeDecl = false;
    return ContextKind.OBJECT;
  }
  if (ctx.lastClosedParams) return ContextKind.FUNCTION;

  if (prev?.type === TokenType.FUNCTION) return ContextKind.FUNCTION;
  if (prev?.type === TokenType.CLASS) return ContextKind.CLASS;
  if (isObjectStart(prev, prevValue)) return ContextKind.OBJECT;
  return ContextKind.BLOCK;
}

function isObjectStart(prev: Token | null, val: string | null): boolean {
  if (!prev) return false;
  if (prev.type === TokenType.OPERATOR) return true;
  if (prev.type === TokenType.PUNCTUATION) {
    const ch = val?.[0];
    if (ch === "(" || ch === "[" || ch === "{" || ch === "," || ch === ":" || ch === "?")
      return true;
  }
  if (
    (prev.type === TokenType.KEYWORD || prev.type === TokenType.CONTROL) &&
    val != null &&
    OBJECT_STARTERS.has(val)
  )
    return true;
  return false;
}

export function popBrace(ctx: HighlightState): void {
  const top = ctx.contexts[ctx.contexts.length - 1] ?? null;
  if (!top) return;
  if (
    top.kind === ContextKind.OBJECT ||
    top.kind === ContextKind.BLOCK ||
    top.kind === ContextKind.FUNCTION ||
    top.kind === ContextKind.CLASS
  ) {
    ctx.contexts.pop();
  }
}

export function popLang(ctx: HighlightState): void {
  const top = ctx.contexts[ctx.contexts.length - 1] ?? null;
  if (top?.kind === ContextKind.IMPORT || top?.kind === ContextKind.EXPORT) {
    ctx.contexts.pop();
  }
}

export function isControl(val: string): boolean {
  return val === "if" || val === "while" || val === "for" || val === "switch";
}

export function topCtx(ctx: HighlightState): Context | null {
  return ctx.contexts[ctx.contexts.length - 1] ?? null;
}

export function isParam(val: string, ctx: HighlightState): boolean {
  if (ctx.globalParams.has(val)) return true;
  if (ctx.pendingParams?.includes(val)) return true;
  for (let i = ctx.contexts.length - 1; i >= 0; i--) {
    if (ctx.contexts[i].params?.has(val)) return true;
  }
  return false;
}

export function nearestParameterContext(ctx: HighlightState): Context | null {
  for (let i = ctx.contexts.length - 1; i >= 0; i--) {
    if (ctx.contexts[i].kind === ContextKind.PARAMETERS) return ctx.contexts[i];
  }
  return null;
}
