import { Lexer, type LanguageDefinition, type RawToken } from "./lexer.ts";
import { TokenType, WHITESPACE, createToken, type Token } from "./tokens.ts";
import {
  ContextKind,
  Expectation,
  createContext,
  createState,
  type Context,
  type HighlightState,
} from "./state.ts";

const CONSTANT_RE = /^[A-Z][A-Z0-9_$]*$/;

const CLASS_KEYWORDS = new Set(["new", "extends", "instanceof"]);

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

const CONTROL_HEADER_KEYWORDS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "with",
]);

export class Tokenizer {
  readonly language: LanguageDefinition;
  private lexer: Lexer;
  private keywords: Set<string>;
  private booleans: Set<string>;
  private nulls: Set<string>;
  private constants: Set<string>;
  #sigIndex: Int32Array = new Int32Array(1);

  constructor(language: LanguageDefinition) {
    this.language = language;
    this.lexer = new Lexer(language);
    this.keywords = new Set(language.keywords ?? []);
    this.booleans = new Set(language.booleans ?? []);
    this.nulls = new Set(language.nulls ?? []);
    this.constants = new Set(language.constants ?? []);
  }

  tokenize(source: string): Token[] {
    const raws = this.lexer.tokenize(source);
    this.#buildSigIndex(raws);
    const ctx = createState();
    const out: Token[] = [];
    const { parens, parameterBindings } = this.#analyze(raws);

    for (let i = 0; i < raws.length; i++) {
      out.push(
        this.#process(
          raws[i],
          i,
          raws,
          ctx,
          out,
          source,
          parens,
          parameterBindings,
        ),
      );
    }

    return out;
  }

  #process(
    raw: RawToken,
    idx: number,
    raws: RawToken[],
    ctx: HighlightState,
    out: Token[],
    src: string,
    parens: Map<number, number>,
    parameterBindings: Set<number>,
  ): Token {
    if (raw.type === "whitespace") {
      return createToken(WHITESPACE, raw.start, raw.end);
    }

    if (raw.type !== "identifier") {
      ctx.functionName = null;
    }

    const isArrow = raw.type === "operator" && raw.value === "=>";
    if (!isArrow) ctx.afterArrow = false;

    const ch = src[raw.start];
    if (ch !== "{" && ch !== ")") ctx.lastClosedParams = false;

    let tok: Token;
    switch (raw.type) {
      case "identifier":
        tok = this.#identifier(raw, idx, raws, ctx, src, parameterBindings);
        break;
      case "operator":
        tok = this.#operator(raw, ctx, out, src);
        break;
      case "punctuation":
        tok = this.#punctuation(raw, idx, raws, ctx, src, parens);
        break;
      case "number":
        ctx.expectation = Expectation.NONE;
        tok = createToken(TokenType.NUMBER, raw.start, raw.end);
        break;
      case "string":
        ctx.expectation = Expectation.NONE;
        tok = createToken(TokenType.STRING, raw.start, raw.end);
        break;
      case "regex":
        ctx.expectation = Expectation.NONE;
        tok = createToken(TokenType.REGEX, raw.start, raw.end);
        break;
      case "comment":
        ctx.expectation = Expectation.NONE;
        tok = createToken(TokenType.COMMENT, raw.start, raw.end);
        break;
      case "decorator":
        ctx.expectation = Expectation.NONE;
        tok = createToken(TokenType.DECORATOR, raw.start, raw.end);
        break;
      default:
        tok = createToken(TokenType.IDENTIFIER, raw.start, raw.end);
    }

    ctx.previousToken = tok;
    ctx.previousValue = raw.value;
    return tok;
  }

  #identifier(
    raw: RawToken,
    idx: number,
    raws: RawToken[],
    ctx: HighlightState,
    src: string,
    parameterBindings: Set<number>,
  ): Token {
    const val = raw.value;

    if (parameterBindings.has(idx)) {
      const params = this.#nearestParameterContext(ctx);
      if (params) params.names.push(val);
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.PARAMETER, raw.start, raw.end);
    }

    if (ctx.expectation === Expectation.PROPERTY) {
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.PROPERTY, raw.start, raw.end);
    }

    if (ctx.expectation === Expectation.FUNCTION_NAME) {
      ctx.expectation = Expectation.NONE;
      ctx.functionName = val;
      ctx.declarations.set(val, "function");
      return createToken(TokenType.FUNCTION, raw.start, raw.end);
    }
    if (ctx.expectation === Expectation.CLASS_NAME) {
      ctx.expectation = Expectation.NONE;
      ctx.declarations.set(val, "class");
      return createToken(TokenType.CLASS, raw.start, raw.end);
    }

    if (this.keywords.has(val)) {
      this.#setKeywordState(val, ctx);
      return createToken(TokenType.KEYWORD, raw.start, raw.end);
    }
    if (this.nulls.has(val)) {
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.NULL, raw.start, raw.end);
    }
    if (this.booleans.has(val)) {
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.BOOLEAN, raw.start, raw.end);
    }
    if (this.constants.has(val)) {
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.CONSTANT, raw.start, raw.end);
    }

    const top = this.#topCtx(ctx);
    if (top?.kind === ContextKind.PARAMETERS && top.expectName && top.names) {
      top.expectName = false;
      top.names.push(val);
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.PARAMETER, raw.start, raw.end);
    }

    if (this.#isParam(val, ctx)) {
      return createToken(TokenType.PARAMETER, raw.start, raw.end);
    }

    const prev = ctx.previousToken;
    if (
      prev?.type === TokenType.KEYWORD &&
      ctx.previousValue != null &&
      CLASS_KEYWORDS.has(ctx.previousValue)
    ) {
      return createToken(TokenType.CLASS, raw.start, raw.end);
    }

    const decl = ctx.declarations.get(val);
    if (decl === "function")
      return createToken(TokenType.FUNCTION, raw.start, raw.end);
    if (decl === "class")
      return createToken(TokenType.CLASS, raw.start, raw.end);

    const nxt = this.#nextSig(raws, idx);
    if (nxt?.type === "punctuation" && src[nxt.start] === "(") {
      return createToken(TokenType.FUNCTION, raw.start, raw.end);
    }

    if (
      nxt?.type === "punctuation" &&
      src[nxt.start] === ":" &&
      top?.kind === ContextKind.OBJECT
    ) {
      return createToken(TokenType.PROPERTY, raw.start, raw.end);
    }

    if (CONSTANT_RE.test(val))
      return createToken(TokenType.CONSTANT, raw.start, raw.end);
    return createToken(TokenType.VARIABLE, raw.start, raw.end);
  }

  #operator(raw: RawToken, ctx: HighlightState, out: Token[], src: string): Token {
    const op = raw.value;

    if (op === "=>") {
      ctx.afterArrow = true;
      this.#retroParams(out, ctx, src);
    } else if (op === "?.") {
      ctx.expectation = Expectation.PROPERTY;
    } else {
      ctx.expectation = Expectation.NONE;
    }

    return createToken(TokenType.OPERATOR, raw.start, raw.end);
  }

  #punctuation(
    raw: RawToken,
    idx: number,
    raws: RawToken[],
    ctx: HighlightState,
    src: string,
    parens: Map<number, number>,
  ): Token {
    const ch = src[raw.start];
    const tok = createToken(TokenType.PUNCTUATION, raw.start, raw.end);

    switch (ch) {
      case ".":
        ctx.expectation = Expectation.PROPERTY;
        break;

      case "#":
        ctx.expectation = Expectation.PROPERTY;
        break;

      case "(": {
        const closeIdx = parens.get(idx);
        const after =
          closeIdx != null ? this.#nextSig(raws, closeIdx) : null;
        const nextIsBrace =
          after?.type === "punctuation" && src[after.start] === "{";
        const prevIsControl =
          ctx.previousToken?.type === TokenType.KEYWORD &&
          ctx.previousValue != null &&
          this.#isControl(ctx.previousValue);
        const binds = nextIsBrace && !prevIsControl;

        pushCtx(
          ctx,
          createContext(ContextKind.PARAMETERS, {
            names: [],
            expectName: binds,
            bindsNames: binds,
            isFnParams: ctx.functionName != null,
          }),
        );
        ctx.expectation = Expectation.NONE;
        break;
      }

      case ")": {
        const c = popCtx(ctx, ContextKind.PARAMETERS);
        if (c) {
          ctx.lastClosedParams = !!c.isFnParams;
          if (c.names.length) ctx.pendingParams = c.names.slice();
        }
        ctx.expectation = Expectation.NONE;
        break;
      }

      case "[":
        pushCtx(ctx, createContext(ContextKind.ARRAY));
        ctx.expectation = Expectation.NONE;
        break;

      case "]":
        popCtx(ctx, ContextKind.ARRAY);
        ctx.expectation = Expectation.NONE;
        break;

      case "{": {
        const kind = this.#braceKind(ctx);
        pushCtx(ctx, createContext(kind));
        if (ctx.pendingParams) {
          const set = (this.#topCtx(ctx)!.params ??= new Set());
          for (const n of ctx.pendingParams) set.add(n);
          ctx.pendingParams = null;
        }
        ctx.lastClosedParams = false;
        ctx.expectation = Expectation.NONE;
        break;
      }

      case "}":
        if (raw.detail?.templateClose) {
          while (
            ctx.contexts.length &&
            this.#topCtx(ctx)?.kind !== ContextKind.TEMPLATE_EXPRESSION
          ) {
            ctx.contexts.pop();
          }
          if (ctx.contexts.length) ctx.contexts.pop();
        } else {
          this.#popBrace(ctx);
        }
        ctx.expectation = Expectation.NONE;
        break;

      case ";":
        ctx.pendingParams = null;
        this.#popLang(ctx);
        ctx.expectation = Expectation.NONE;
        break;

      case ",": {
        const top = this.#topCtx(ctx);
        if (top?.kind === ContextKind.PARAMETERS && top.bindsNames) {
          top.expectName = true;
        }
        ctx.expectation = Expectation.NONE;
        break;
      }

      default:
        ctx.expectation = Expectation.NONE;
        break;
    }

    if (raw.detail?.templateOpen) {
      pushCtx(ctx, createContext(ContextKind.TEMPLATE_EXPRESSION));
    }

    return tok;
  }

  #setKeywordState(val: string, ctx: HighlightState): void {
    if (val === "function") ctx.expectation = Expectation.FUNCTION_NAME;
    else if (val === "class") ctx.expectation = Expectation.CLASS_NAME;
    else if (val === "import") {
      pushCtx(ctx, createContext(ContextKind.IMPORT));
      ctx.expectation = Expectation.NONE;
    } else if (val === "export") {
      pushCtx(ctx, createContext(ContextKind.EXPORT));
      ctx.expectation = Expectation.NONE;
    } else {
      ctx.expectation = Expectation.NONE;
    }
  }

  #braceKind(ctx: HighlightState): ContextKind {
    if (ctx.afterArrow) {
      ctx.afterArrow = false;
      return ContextKind.FUNCTION;
    }
    if (ctx.lastClosedParams) return ContextKind.FUNCTION;

    const prev = ctx.previousToken;
    if (prev?.type === TokenType.FUNCTION) return ContextKind.FUNCTION;
    if (prev?.type === TokenType.CLASS) return ContextKind.CLASS;
    if (this.#isObjectStart(prev, ctx.previousValue)) return ContextKind.OBJECT;
    return ContextKind.BLOCK;
  }

  #isObjectStart(prev: Token | null, val: string | null): boolean {
    if (!prev) return false;
    if (prev.type === TokenType.OPERATOR) return true;
    if (prev.type === TokenType.PUNCTUATION) {
      const ch = val?.[0];
      if (
        ch === "(" ||
        ch === "[" ||
        ch === "{" ||
        ch === "," ||
        ch === ":" ||
        ch === "?"
      )
        return true;
    }
    if (prev.type === TokenType.KEYWORD && val != null && OBJECT_STARTERS.has(val))
      return true;
    return false;
  }

  #popBrace(ctx: HighlightState): void {
    const top = this.#topCtx(ctx);
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

  #popLang(ctx: HighlightState): void {
    const top = this.#topCtx(ctx);
    if (top?.kind === ContextKind.IMPORT || top?.kind === ContextKind.EXPORT) {
      ctx.contexts.pop();
    }
  }

  #isControl(val: string): boolean {
    return val === "if" || val === "while" || val === "for" || val === "switch";
  }

  #retroParams(out: Token[], ctx: HighlightState, src: string): void {
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
      this.#addParams(ctx, names);
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
          if (depth === 1) this.#addParams(ctx, names);
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

  #addParams(ctx: HighlightState, names: string[]): void {
    let target: Context | null = null;
    for (let i = ctx.contexts.length - 1; i >= 0; i--) {
      const c = ctx.contexts[i].kind;
      if (
        c === ContextKind.FUNCTION ||
        c === ContextKind.CLASS ||
        c === ContextKind.BLOCK
      ) {
        target = ctx.contexts[i];
        break;
      }
    }
    const set = target ? (target.params ??= new Set()) : ctx.globalParams;
    for (const n of names) set.add(n);
  }

  #isParam(val: string, ctx: HighlightState): boolean {
    if (ctx.globalParams.has(val)) return true;
    if (ctx.pendingParams?.includes(val)) return true;
    for (let i = ctx.contexts.length - 1; i >= 0; i--) {
      if (ctx.contexts[i].params?.has(val)) return true;
    }
    return false;
  }

  #topCtx(ctx: HighlightState): Context | null {
    return ctx.contexts[ctx.contexts.length - 1] ?? null;
  }

  /**
   * `#sigIndex[i]` is the first index >= i holding a significant token —
   * neither whitespace nor a comment — or `raws.length` when there is none.
   * Built once per tokenize() so lookahead is O(1) rather than a fresh scan
   * per identifier, and so a comment between two tokens is transparent
   * (`foo /* c *\/ ()` still reads as a call).
   */
  #buildSigIndex(raws: RawToken[]): void {
    const next = new Int32Array(raws.length + 1);
    next[raws.length] = raws.length;
    for (let i = raws.length - 1; i >= 0; i--) {
      const type = raws[i].type;
      next[i] = type === WHITESPACE || type === "comment" ? next[i + 1]! : i;
    }
    this.#sigIndex = next;
  }

  #nextSig(raws: RawToken[], idx: number): RawToken | null {
    const i = this.#sigIndex[idx + 1] ?? raws.length;
    return i < raws.length ? raws[i] : null;
  }

  #nextSigIndex(raws: RawToken[], idx: number): number {
    return this.#sigIndex[idx] ?? raws.length;
  }

  #analyze(raws: RawToken[]): {
    parens: Map<number, number>;
    parameterBindings: Set<number>;
  } {
    const parens = new Map<number, number>();
    const parameterBindings = new Set<number>();
    const stack: number[] = [];
    const prevStack: number[] = [];
    let prevSig = -1;

    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      if (raw.type === "whitespace") continue;
      if (raw.type !== "punctuation") {
        prevSig = i;
        continue;
      }
      if (raw.value === "(") {
        stack.push(i);
        prevStack.push(prevSig);
        prevSig = i;
        continue;
      }
      if (raw.value === ")") {
        const open = stack.pop();
        const prevAtOpen = prevStack.pop();
        if (open != null && prevAtOpen !== undefined) {
          parens.set(open, i);
          const after = this.#nextSig(raws, i);
          const previous = prevAtOpen >= 0 ? raws[prevAtOpen] : null;
          const isArrow = after?.value === "=>";
          const isBodyHeader =
            after?.value === "{" &&
            previous?.type === "identifier" &&
            !CONTROL_HEADER_KEYWORDS.has(previous.value);
          if (isArrow || isBodyHeader) {
            this.#collectBindings(raws, open + 1, i, parameterBindings);
          }
        }
        prevSig = i;
        continue;
      }
      prevSig = i;
    }

    return { parens, parameterBindings };
  }

  #collectBindings(
    raws: RawToken[],
    start: number,
    end: number,
    bindings: Set<number>,
  ): void {
    let i = this.#nextSigIndex(raws, start);
    while (i < end) {
      i = this.#parseBinding(raws, i, end, bindings);
      i = this.#nextSigIndex(raws, i);
      if (raws[i]?.value === ",") i = this.#nextSigIndex(raws, i + 1);
      else if (i < end) i += 1;
    }
  }

  #parseBinding(
    raws: RawToken[],
    index: number,
    end: number,
    bindings: Set<number>,
  ): number {
    let i = this.#nextSigIndex(raws, index);
    if (i >= end) return i;
    const token = raws[i];

    if (token.type === "operator" && token.value === "...") {
      return this.#parseBinding(raws, i + 1, end, bindings);
    }
    if (token.type === "punctuation" && token.value === "{") {
      return this.#parseObjectBinding(raws, i, end, bindings);
    }
    if (token.type === "punctuation" && token.value === "[") {
      return this.#parseArrayBinding(raws, i, end, bindings);
    }
    if (token.type === "identifier") {
      bindings.add(i);
      const next = this.#nextSigIndex(raws, i + 1);
      if (raws[next]?.value === "=") {
        return this.#skipDefault(raws, next + 1, end, new Set([",", ")"]));
      }
      return next;
    }
    return this.#skipDefault(raws, i + 1, end, new Set([",", ")"]));
  }

  #parseObjectBinding(
    raws: RawToken[],
    open: number,
    end: number,
    bindings: Set<number>,
  ): number {
    let i = this.#nextSigIndex(raws, open + 1);
    while (i < end && raws[i].value !== "}") {
      if (raws[i].type === "operator" && raws[i].value === "...") {
        i = this.#parseBinding(raws, i + 1, end, bindings);
      } else if (raws[i].value === "[") {
        i = this.#skipBalanced(raws, i, end, "[", "]");
        i = this.#nextSigIndex(raws, i);
        if (raws[i]?.value === ":") {
          i = this.#parseBinding(raws, i + 1, end, bindings);
        }
      } else if (raws[i].type === "identifier") {
        const key = i;
        const next = this.#nextSigIndex(raws, i + 1);
        if (raws[next]?.value === ":") {
          i = this.#parseBinding(raws, next + 1, end, bindings);
        } else {
          bindings.add(key);
          i = raws[next]?.value === "="
            ? this.#skipDefault(raws, next + 1, end, new Set([",", "}"]))
            : next;
        }
      } else {
        i += 1;
      }
      i = this.#nextSigIndex(raws, i);
      if (raws[i]?.value === ",") i = this.#nextSigIndex(raws, i + 1);
    }
    return i < end ? i + 1 : i;
  }

  #parseArrayBinding(
    raws: RawToken[],
    open: number,
    end: number,
    bindings: Set<number>,
  ): number {
    let i = this.#nextSigIndex(raws, open + 1);
    while (i < end && raws[i].value !== "]") {
      if (raws[i].value === ",") {
        i = this.#nextSigIndex(raws, i + 1);
        continue;
      }
      i = this.#parseBinding(raws, i, end, bindings);
      i = this.#nextSigIndex(raws, i);
      if (raws[i]?.value === ",") i = this.#nextSigIndex(raws, i + 1);
    }
    return i < end ? i + 1 : i;
  }

  #skipDefault(
    raws: RawToken[],
    index: number,
    end: number,
    stops: Set<string>,
  ): number {
    let i = this.#nextSigIndex(raws, index);
    let depth = 0;
    while (i < end) {
      const value = raws[i].value;
      if (value === "(" || value === "[" || value === "{") depth += 1;
      else if (value === ")" || value === "]" || value === "}") {
        if (depth === 0 && stops.has(value)) return i;
        depth = Math.max(0, depth - 1);
      } else if (depth === 0 && stops.has(value)) {
        return i;
      }
      i = this.#nextSigIndex(raws, i + 1);
    }
    return i;
  }

  #skipBalanced(
    raws: RawToken[],
    open: number,
    end: number,
    opening: string,
    closing: string,
  ): number {
    let depth = 0;
    let i = open;
    while (i < end) {
      if (raws[i].value === opening) depth += 1;
      else if (raws[i].value === closing) {
        depth -= 1;
        if (depth === 0) return i + 1;
      }
      i += 1;
    }
    return i;
  }

  #nearestParameterContext(ctx: HighlightState): Context | null {
    for (let i = ctx.contexts.length - 1; i >= 0; i--) {
      if (ctx.contexts[i].kind === ContextKind.PARAMETERS) return ctx.contexts[i];
    }
    return null;
  }
}

function pushCtx(ctx: HighlightState, c: Context): void {
  ctx.contexts.push(c);
}

function popCtx(ctx: HighlightState, kind: ContextKind): Context | null {
  const top = ctx.contexts[ctx.contexts.length - 1];
  if (top && top.kind === kind) return ctx.contexts.pop() ?? null;
  return null;
}
