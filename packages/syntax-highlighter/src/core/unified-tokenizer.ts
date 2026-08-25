import type { LanguageDefinition, RawToken, TokenizerFeatures } from "./lexer.ts";
import {
  type Context,
  ContextKind,
  createContext,
  createState,
  Expectation,
  type HighlightState,
  pushCtx,
  popCtx,
} from "./state.ts";
import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";
import { UnifiedLexer } from "./unified-lexer.ts";
import { retroParams } from "./retroactive-params.ts";
import {
  analyzeBindings,
  skipTypeAnnotation,
  isTypeAliasName,
} from "./binding-analyzer.ts";
import {
  setKeywordState,
  braceKind,
  popBrace,
  popLang,
  isControl,
  topCtx,
  isParam,
  nearestParameterContext,
} from "./context-helpers.ts";

const CONSTANT_RE = /^[A-Z][A-Z0-9_$]*$/;

const CLASS_KEYWORDS = new Set(["new", "extends", "instanceof"]);

const TYPE_DECL_KEYWORDS = new Set(["interface", "enum", "type"]);

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
      const analysis = analyzeBindings(raws, this.sigIndex);
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
      const analysis = analyzeBindings(raws, this.sigIndex);
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
        out.push(createToken(t.type, t.start + start, t.end + start));
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
      const params = nearestParameterContext(ctx);
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
      if (this.features.contextStack) setKeywordState(val, ctx);
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
      const top = topCtx(ctx);
      if (top?.kind === ContextKind.PARAMETERS && top.expectName && top.names) {
        top.expectName = false;
        top.names.push(val);
        ctx.expectation = Expectation.NONE;
        return createToken(TokenType.PARAMETER, raw.start, raw.end);
      }

      if (isParam(val, ctx)) {
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
        (ctx.previousValue !== "type" || isTypeAliasName(raws, idx, this.sigIndex))
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
    if (this.features.contextStack && nxt?.type === "punctuation" && src[nxt.start] === ":" && topCtx(ctx)?.kind === ContextKind.OBJECT) {
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
        retroParams(out, ctx, src);
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
          isControl(ctx.previousValue);
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
        const kind = braceKind(ctx, ctx.previousToken, ctx.previousValue);
        pushCtx(ctx, createContext(kind));
        if (ctx.pendingParams) {
          const set = (topCtx(ctx)!.params ??= new Set());
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
            topCtx(ctx)?.kind !== ContextKind.TEMPLATE_EXPRESSION
          ) {
            ctx.contexts.pop();
          }
          if (ctx.contexts.length) ctx.contexts.pop();
        } else {
          popBrace(ctx);
        }
        ctx.expectation = Expectation.NONE;
        break;
      case ";":
        ctx.pendingParams = null;
        popLang(ctx);
        ctx.expectation = Expectation.NONE;
        break;
      case ",": {
        const top = topCtx(ctx);
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
}
