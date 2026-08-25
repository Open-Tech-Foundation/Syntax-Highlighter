import type { LanguageDefinition, RawToken, TokenizerFeatures } from "./lexer.ts";
import {
  type Context,
  ContextKind,
  createContext,
  createState,
  Expectation,
  type HighlightState,
} from "./state.ts";
import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";
import { UnifiedLexer } from "./unified-lexer.ts";

const CONSTANT_RE = /^[A-Z][A-Z0-9_$]*$/;

const CLASS_KEYWORDS = new Set(["new", "extends", "instanceof"]);

const TYPE_DECL_KEYWORDS = new Set(["interface", "enum", "type"]);

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

const CONTROL_HEADER_KEYWORDS = new Set(["if", "for", "while", "switch", "with"]);

/**
 * Resolve feature flags: when `semantic === "javascript"`, all features
 * default to `true`; otherwise all default to `false`. Per-language overrides
 * in `features` take precedence.
 */
function resolveFeatures(lang: LanguageDefinition): Required<TokenizerFeatures> {
  const isJS = lang.semantic === "javascript";
  const f = lang.features ?? {};
  return {
    parameterBindings: f.parameterBindings ?? isJS,
    contextStack: f.contextStack ?? isJS,
    declarations: f.declarations ?? isJS,
    retroactiveRewrite: f.retroactiveRewrite ?? isJS,
    typeAnnotationAware: f.typeAnnotationAware ?? isJS,
    propertyKeys: f.propertyKeys ?? false,
  };
}

/**
 * Unified tokenizer — one class, one pipeline, config-driven.
 *
 * Uses `UnifiedLexer` which handles both code and markup tokenization at the
 * lexing stage. The classifier runs a single loop over the raw token stream,
 * with optional JS-specific features (parameter bindings, context tracking,
 * declarations, retroactive rewriting) gated behind `LanguageDefinition.features`.
 *
 * No mode-specific scan methods. No `if (semantic === "javascript")` branches
 * in `tokenize()`. The language definition's data controls everything.
 */
export class UnifiedTokenizer {
  readonly language: LanguageDefinition;
  private lexer: UnifiedLexer;
  private keywords: Set<string>;
  private booleans: Set<string>;
  private nulls: Set<string>;
  private constants: Set<string>;
  private features: Required<TokenizerFeatures>;
  private sigIndex: Int32Array = new Int32Array(1);

  constructor(language: LanguageDefinition) {
    if (!language || typeof language !== "object") {
      throw new Error("UnifiedTokenizer requires a language definition object");
    }
    this.language = language;
    this.lexer = new UnifiedLexer(language);
    const fold = language.caseInsensitive ? (w: string) => w.toLowerCase() : (w: string) => w;
    this.keywords = new Set((language.keywords ?? []).map(fold));
    this.booleans = new Set((language.booleans ?? []).map(fold));
    this.nulls = new Set((language.nulls ?? []).map(fold));
    this.constants = new Set((language.constants ?? []).map(fold));
    this.features = resolveFeatures(language);
  }

  // ----------------------------------------------------------------
  // Single entry point — always the same pipeline.
  // ----------------------------------------------------------------

  tokenize(source: string): Token[] {
    const raws = this.lexer.tokenize(source);
    this.buildSigIndex(raws);

    // ---- Handle embedded languages (e.g. <script> in HTML) ----
    if (this.lexer.embedRegions.length > 0) {
      return this.#tokenizeWithEmbeds(source, raws);
    }

    let parens: Map<number, number> = new Map();
    let parameterBindings: Set<number> = new Set();
    if (this.features.parameterBindings) {
      const analysis = this.analyzeBindings(raws);
      parens = analysis.parens;
      parameterBindings = analysis.parameterBindings;
    }

    const ctx = createState();
    const out: Token[] = [];

    for (let i = 0; i < raws.length; i++) {
      out.push(this.classify(raws[i], i, raws, ctx, out, source, parens, parameterBindings));
    }

    return out;
  }

  /**
   * Tokenize with embedded language support: classify outer tokens normally,
   * delegate embedded regions to a sub-tokenizer for that language.
   */
  #tokenizeWithEmbeds(source: string, raws: RawToken[]): Token[] {
    const embedRegions = this.lexer.embedRegions;

    // Build a set of raw-token indices that belong to embedded regions
    const embedRawIndices = new Set<number>();
    for (let ri = 0; ri < raws.length; ri++) {
      const r = raws[ri];
      for (const [start, end] of embedRegions) {
        if (r.start >= start && r.end <= end) {
          embedRawIndices.add(ri);
          break;
        }
      }
    }

    // Classify non-embedded tokens with the normal pipeline
    let parens: Map<number, number> = new Map();
    let parameterBindings: Set<number> = new Set();
    if (this.features.parameterBindings) {
      const analysis = this.analyzeBindings(raws);
      parens = analysis.parens;
      parameterBindings = analysis.parameterBindings;
    }
    const ctx = createState();
    const out: Token[] = [];
    for (let i = 0; i < raws.length; i++) {
      if (!embedRawIndices.has(i)) {
        out.push(this.classify(raws[i], i, raws, ctx, out, source, parens, parameterBindings));
      }
    }

    // Delegate embedded regions to sub-tokenizers
    const cache = new Map<LanguageDefinition, UnifiedTokenizer>();
    for (const [start, end, embedDef] of embedRegions) {
      let sub = cache.get(embedDef);
      if (!sub) {
        sub = new UnifiedTokenizer(embedDef);
        cache.set(embedDef, sub);
      }
      const subTokens = sub.tokenize(source.slice(start, end));
      for (const t of subTokens) {
        if (t.type !== WHITESPACE) {
          out.push(createToken(t.type, t.start + start, t.end + start));
        }
      }
    }

    // Sort by start position
    out.sort((a, b) => a.start - b.start);
    return out;
  }

  // ----------------------------------------------------------------
  // Unified classifier — handles every raw token type in one switch.
  // ----------------------------------------------------------------

  private classify(
    raw: RawToken,
    idx: number,
    raws: RawToken[],
    ctx: HighlightState,
    out: Token[],
    src: string,
    parens: Map<number, number>,
    parameterBindings: Set<number>,
  ): Token {
    // ---- Markup types: pass through directly (produced by UnifiedLexer) ----
    const rawType = raw.type as string;
    if (rawType === "tag") return createToken(TokenType.TAG, raw.start, raw.end);
    if (rawType === "attribute") return createToken(TokenType.ATTRIBUTE, raw.start, raw.end);
    if (rawType === "text") return createToken(TokenType.TEXT, raw.start, raw.end);

    // ---- Whitespace: always the same ----
    if (raw.type === "whitespace") {
      return createToken(WHITESPACE, raw.start, raw.end);
    }

    // ---- JS: non-identifier clears function name tracking ----
    if (raw.type !== "identifier") {
      ctx.functionName = null;
    }

    // ---- JS: track arrow state ----
    const isArrow = raw.type === "operator" && raw.value === "=>";
    if (!isArrow) ctx.afterArrow = false;

    // ---- Code token types: dispatch to type-specific classifiers ----
    let tok: Token;
    switch (raw.type) {
      case "identifier":
        tok = this.classifyIdentifier(raw, idx, raws, ctx, out, src, parens, parameterBindings);
        break;
      case "operator":
        tok = this.classifyOperator(raw, ctx, out, src);
        break;
      case "punctuation":
        tok = this.classifyPunctuation(raw, idx, raws, ctx, src, parens);
        break;
      case "number":
        ctx.expectation = Expectation.NONE;
        tok = createToken(TokenType.NUMBER, raw.start, raw.end);
        break;
      case "string": {
        ctx.expectation = Expectation.NONE;
        if (this.features.propertyKeys) {
          const nxt = this.nextSig(raws, idx);
          if (nxt?.value === ":") {
            tok = createToken(TokenType.KEY, raw.start, raw.end);
            break;
          }
        }
        tok = createToken(TokenType.STRING, raw.start, raw.end);
        break;
      }
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

    // ---- JS: update previous token state for next iteration ----
    ctx.previousToken = tok;
    ctx.previousValue = raw.value;

    return tok;
  }

  // ----------------------------------------------------------------
  // Identifier classification — shared by all modes.
  // JS features are gated behind this.features and ctx.
  // ----------------------------------------------------------------

  private classifyIdentifier(
    raw: RawToken,
    idx: number,
    raws: RawToken[],
    ctx: HighlightState,
    out: Token[],
    src: string,
    parens: Map<number, number>,
    parameterBindings: Set<number>,
  ): Token {
    const val = this.language.caseInsensitive ? raw.value.toLowerCase() : raw.value;

    // ---- JS features: parameter bindings from pre-analysis ----
    if (parameterBindings.has(idx)) {
      const params = this.nearestParameterContext(ctx);
      if (params) params.names.push(val);
      ctx.expectation = Expectation.NONE;
      return createToken(TokenType.PARAMETER, raw.start, raw.end);
    }

    // ---- JS features: expectation-driven classification ----
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

    // ---- Word-list classification (all modes) ----
    if (this.keywords.has(val)) {
      if (this.features.contextStack) this.setKeywordState(val, ctx);
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

    // ---- JS features: context-aware classification ----
    if (this.features.contextStack) {
      const top = this.topCtx(ctx);
      if (top?.kind === ContextKind.PARAMETERS && top.expectName && top.names) {
        top.expectName = false;
        top.names.push(val);
        ctx.expectation = Expectation.NONE;
        return createToken(TokenType.PARAMETER, raw.start, raw.end);
      }

      if (this.isParam(val, ctx)) {
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

      if (
        prev?.type === TokenType.KEYWORD &&
        ctx.previousValue != null &&
        TYPE_DECL_KEYWORDS.has(ctx.previousValue) &&
        (ctx.previousValue !== "type" || this.isTypeAliasName(raws, idx))
      ) {
        ctx.afterTypeDecl = true;
        return createToken(TokenType.CLASS, raw.start, raw.end);
      }

      const decl = ctx.declarations.get(val);
      if (decl === "function") {
        return createToken(TokenType.FUNCTION, raw.start, raw.end);
      }
      if (decl === "class") {
        return createToken(TokenType.CLASS, raw.start, raw.end);
      }
    }

    // ---- Structural cues (all modes) ----
    const nxt = this.nextSig(raws, idx);

    // Identifier before `(` → function call/declaration
    if (nxt?.type === "punctuation" && src[nxt.start] === "(") {
      return createToken(TokenType.FUNCTION, raw.start, raw.end);
    }

    // JS: identifier before `:` inside an object → property key
    if (this.features.contextStack && nxt?.type === "punctuation" && src[nxt.start] === ":" && this.topCtx(ctx)?.kind === ContextKind.OBJECT) {
      return createToken(TokenType.PROPERTY, raw.start, raw.end);
    }

    // SCREAMING_CASE → constant
    if (CONSTANT_RE.test(val)) {
      return createToken(TokenType.CONSTANT, raw.start, raw.end);
    }

    return createToken(TokenType.VARIABLE, raw.start, raw.end);
  }

  // ----------------------------------------------------------------
  // Operator classification
  // ----------------------------------------------------------------

  private classifyOperator(
    raw: RawToken,
    ctx: HighlightState,
    out: Token[],
    src: string,
  ): Token {
    const op = raw.value;

    if (op === "=>") {
      ctx.afterArrow = true;
      if (this.features.retroactiveRewrite) {
        this.retroParams(out, ctx, src);
      }
    } else if (op === "?.") {
      ctx.expectation = Expectation.PROPERTY;
    } else {
      ctx.expectation = Expectation.NONE;
    }

    return createToken(TokenType.OPERATOR, raw.start, raw.end);
  }

  // ----------------------------------------------------------------
  // Punctuation classification — context stack management
  // ----------------------------------------------------------------

  private classifyPunctuation(
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
        const after = closeIdx != null ? this.nextSig(raws, closeIdx) : null;
        const nextIsBrace = after?.type === "punctuation" && src[after.start] === "{";
        const prevIsControl =
          ctx.previousToken?.type === TokenType.KEYWORD &&
          ctx.previousValue != null &&
          this.isControl(ctx.previousValue);
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
        const kind = this.braceKind(ctx);
        pushCtx(ctx, createContext(kind));
        if (ctx.pendingParams) {
          const set = (this.topCtx(ctx)!.params ??= new Set());
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
            this.topCtx(ctx)?.kind !== ContextKind.TEMPLATE_EXPRESSION
          ) {
            ctx.contexts.pop();
          }
          if (ctx.contexts.length) ctx.contexts.pop();
        } else {
          this.popBrace(ctx);
        }
        ctx.expectation = Expectation.NONE;
        break;
      case ";":
        ctx.pendingParams = null;
        this.popLang(ctx);
        ctx.expectation = Expectation.NONE;
        break;
      case ",": {
        const top = this.topCtx(ctx);
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

    // Track non-brace, non-paren tokens for state resets
    if (ch !== "{" && ch !== ")") {
      ctx.lastClosedParams = false;
      if (ch === ";") ctx.afterTypeDecl = false;
    }

    return tok;
  }

  // ----------------------------------------------------------------
  // JS-specific helpers (only called when ctx is non-null)
  // ----------------------------------------------------------------

  private setKeywordState(val: string, ctx: HighlightState): void {
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

  private braceKind(ctx: HighlightState): ContextKind {
    if (ctx.afterArrow) {
      ctx.afterArrow = false;
      return ContextKind.FUNCTION;
    }
    if (ctx.afterTypeDecl) {
      ctx.afterTypeDecl = false;
      return ContextKind.OBJECT;
    }
    if (ctx.lastClosedParams) return ContextKind.FUNCTION;

    const prev = ctx.previousToken;
    if (prev?.type === TokenType.FUNCTION) return ContextKind.FUNCTION;
    if (prev?.type === TokenType.CLASS) return ContextKind.CLASS;
    if (this.isObjectStart(prev, ctx.previousValue)) return ContextKind.OBJECT;
    return ContextKind.BLOCK;
  }

  private isObjectStart(prev: Token | null, val: string | null): boolean {
    if (!prev) return false;
    if (prev.type === TokenType.OPERATOR) return true;
    if (prev.type === TokenType.PUNCTUATION) {
      const ch = val?.[0];
      if (ch === "(" || ch === "[" || ch === "{" || ch === "," || ch === ":" || ch === "?")
        return true;
    }
    if (prev.type === TokenType.KEYWORD && val != null && OBJECT_STARTERS.has(val)) return true;
    return false;
  }

  private popBrace(ctx: HighlightState): void {
    const top = this.topCtx(ctx);
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

  private popLang(ctx: HighlightState): void {
    const top = this.topCtx(ctx);
    if (top?.kind === ContextKind.IMPORT || top?.kind === ContextKind.EXPORT) {
      ctx.contexts.pop();
    }
  }

  private isControl(val: string): boolean {
    return val === "if" || val === "while" || val === "for" || val === "switch";
  }

  private topCtx(ctx: HighlightState): Context | null {
    return ctx.contexts[ctx.contexts.length - 1] ?? null;
  }

  private isParam(val: string, ctx: HighlightState): boolean {
    if (ctx.globalParams.has(val)) return true;
    if (ctx.pendingParams?.includes(val)) return true;
    for (let i = ctx.contexts.length - 1; i >= 0; i--) {
      if (ctx.contexts[i].params?.has(val)) return true;
    }
    return false;
  }

  private nearestParameterContext(ctx: HighlightState): Context | null {
    for (let i = ctx.contexts.length - 1; i >= 0; i--) {
      if (ctx.contexts[i].kind === ContextKind.PARAMETERS) return ctx.contexts[i];
    }
    return null;
  }

  // ----------------------------------------------------------------
  // Retroactive parameter rewriting (triggered by `=>`)
  // ----------------------------------------------------------------

  private retroParams(out: Token[], ctx: HighlightState, src: string): void {
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
      this.addParams(ctx, names);
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
          if (depth === 1) this.addParams(ctx, names);
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

  private addParams(ctx: HighlightState, names: string[]): void {
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

  // ----------------------------------------------------------------
  // Pre-analysis: parameter bindings (JS feature)
  // ----------------------------------------------------------------

  private analyzeBindings(raws: RawToken[]): {
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
          let afterIdx = this.sigIndex[i + 1] ?? raws.length;
          // See through a TS return annotation: `(...): Type =>` / `(...): Type {`
          if (raws[afterIdx]?.value === ":") {
            afterIdx = this.sigIndex[
              this.skipTypeAnnotation(raws, afterIdx + 1, raws.length, true)
            ] ?? raws.length;
          }
          const after = afterIdx < raws.length ? raws[afterIdx] : null;
          const previous = this.effectiveHeaderPrev(raws, prevAtOpen);
          const isArrow = after?.value === "=>";
          const isBodyHeader =
            after?.value === "{" &&
            previous != null &&
            previous.type === "identifier" &&
            !CONTROL_HEADER_KEYWORDS.has(previous.value);
          if (isArrow || isBodyHeader) {
            this.collectBindings(raws, open + 1, i, parameterBindings);
          }
        }
        prevSig = i;
        continue;
      }
      prevSig = i;
    }

    return { parens, parameterBindings };
  }

  private effectiveHeaderPrev(raws: RawToken[], prevIdx: number): RawToken | null {
    if (prevIdx < 0) return null;
    let i = prevIdx;
    if (raws[i].value === ">" || raws[i].value === ">>" || raws[i].value === ">>>") {
      let depth = 0;
      while (i >= 0) {
        const v = raws[i].value;
        if (v === ">") depth += 1;
        else if (v === ">>") depth += 2;
        else if (v === ">>>") depth += 3;
        else if (v === "<") {
          depth -= 1;
          if (depth <= 0) break;
        } else if (v === "<<") {
          depth -= 2;
          if (depth <= 0) break;
        }
        i -= 1;
      }
      i = this.prevSigIndex(raws, i - 1);
    }
    return i >= 0 ? raws[i] : null;
  }

  private collectBindings(raws: RawToken[], start: number, end: number, bindings: Set<number>): void {
    let i = this.sigIndex[start] ?? raws.length;
    while (i < end) {
      i = this.parseBinding(raws, i, end, bindings);
      i = this.sigIndex[i] ?? raws.length;
      if (raws[i]?.value === ",") i = this.sigIndex[i + 1] ?? raws.length;
      else if (i < end) i += 1;
    }
  }

  private parseBinding(raws: RawToken[], index: number, end: number, bindings: Set<number>): number {
    const i = this.sigIndex[index] ?? raws.length;
    if (i >= end) return i;
    const token = raws[i];

    if (token.type === "operator" && token.value === "...") {
      return this.parseBinding(raws, i + 1, end, bindings);
    }
    if (token.type === "punctuation" && token.value === "{") {
      return this.parseObjectBinding(raws, i, end, bindings);
    }
    if (token.type === "punctuation" && token.value === "[") {
      return this.parseArrayBinding(raws, i, end, bindings);
    }
    if (token.type === "identifier") {
      bindings.add(i);
      const next = this.sigIndex[i + 1] ?? raws.length;
      const nraw = raws[next];
      if (nraw?.value === "=") {
        return this.skipDefault(raws, next + 1, end, new Set([",", ")"]));
      }
      if (nraw?.value === "?") {
        const colonIdx = this.sigIndex[next + 1] ?? raws.length;
        if (raws[colonIdx]?.value === ":") {
          return this.skipTypeAnnotation(raws, colonIdx + 1, end);
        }
        return next;
      }
      if (nraw?.value === ":") {
        return this.skipTypeAnnotation(raws, next + 1, end);
      }
      return next;
    }
    return this.skipDefault(raws, i + 1, end, new Set([",", ")"]));
  }

  private parseObjectBinding(raws: RawToken[], open: number, end: number, bindings: Set<number>): number {
    let i = this.sigIndex[open + 1] ?? raws.length;
    while (i < end && raws[i].value !== "}") {
      if (raws[i].type === "operator" && raws[i].value === "...") {
        i = this.parseBinding(raws, i + 1, end, bindings);
      } else if (raws[i].value === "[") {
        i = this.skipBalanced(raws, i, end, "[", "]");
        i = this.sigIndex[i] ?? raws.length;
        if (raws[i]?.value === ":") {
          i = this.parseBinding(raws, i + 1, end, bindings);
        }
      } else if (raws[i].type === "identifier") {
        const key = i;
        const next = this.sigIndex[i + 1] ?? raws.length;
        if (raws[next]?.value === ":") {
          i = this.parseBinding(raws, next + 1, end, bindings);
        } else {
          bindings.add(key);
          i =
            raws[next]?.value === "="
              ? this.skipDefault(raws, next + 1, end, new Set([",", "}"]))
              : next;
        }
      } else {
        i += 1;
      }
      i = this.sigIndex[i] ?? raws.length;
      if (raws[i]?.value === ",") i = this.sigIndex[i + 1] ?? raws.length;
    }
    return i < end ? i + 1 : i;
  }

  private parseArrayBinding(raws: RawToken[], open: number, end: number, bindings: Set<number>): number {
    let i = this.sigIndex[open + 1] ?? raws.length;
    while (i < end && raws[i].value !== "]") {
      if (raws[i].value === ",") {
        i = this.sigIndex[i + 1] ?? raws.length;
        continue;
      }
      i = this.parseBinding(raws, i, end, bindings);
      i = this.sigIndex[i] ?? raws.length;
      if (raws[i]?.value === ",") i = this.sigIndex[i + 1] ?? raws.length;
    }
    return i < end ? i + 1 : i;
  }

  private skipDefault(raws: RawToken[], index: number, end: number, stops: Set<string>): number {
    let i = this.sigIndex[index] ?? raws.length;
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
      i = this.sigIndex[i + 1] ?? raws.length;
    }
    return i;
  }

  private skipBalanced(
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

  private skipTypeAnnotation(raws: RawToken[], start: number, end: number, stopArrows = false): number {
    let depth = 0;
    let i = start;
    while (i < end) {
      const v = raws[i].value;
      if (
        depth === 0 &&
        (v === "," ||
          v === ")" ||
          v === "]" ||
          v === "}" ||
          (stopArrows && (v === "=>" || v === "{")))
      ) {
        return i;
      }
      if (v === "(" || v === "[" || v === "{" || v === "<") depth += 1;
      else if ((v === ">" || v === ">>" || v === ">>>") && depth > 0) {
        depth = Math.max(0, depth - v.length);
      }
      i += 1;
    }
    return i;
  }

  private isTypeAliasName(raws: RawToken[], idx: number): boolean {
    const nxt = this.nextSig(raws, idx);
    if (!nxt) return false;
    return nxt.type === "operator" && (nxt.value === "=" || nxt.value === "<");
  }

  // ----------------------------------------------------------------
  // Sig index — O(1) lookahead past whitespace/comments
  // ----------------------------------------------------------------

  private buildSigIndex(raws: RawToken[]): void {
    const next = new Int32Array(raws.length + 1);
    next[raws.length] = raws.length;
    for (let i = raws.length - 1; i >= 0; i--) {
      const type = raws[i].type;
      next[i] = type === "whitespace" || type === "comment" ? next[i + 1]! : i;
    }
    this.sigIndex = next;
  }

  private nextSig(raws: RawToken[], idx: number): RawToken | null {
    const i = this.sigIndex[idx + 1] ?? raws.length;
    return i < raws.length ? raws[i] : null;
  }

  private prevSigIndex(raws: RawToken[], idx: number): number {
    for (let i = Math.min(idx, raws.length - 1); i >= 0; i--) {
      const type = raws[i].type;
      if (type !== "whitespace" && type !== "comment") return i;
    }
    return -1;
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
