import { type LanguageDefinition, Lexer, type MarkupConfig, type RawToken } from "./lexer.ts";
import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";

const CONSTANT_RE = /^[A-Z][A-Z0-9_$]*$/;

const NAME_RE = /[a-zA-Z][a-zA-Z0-9-]*/y;
const ATTR_NAME_RE = /[a-zA-Z_:][a-zA-Z0-9_:.-]*/y;
const WS_RE = /\s+/y;

/** Anything that can turn source into a token stream. */
export interface TokenizerLike {
  tokenize(source: string): Token[];
}

/** Factory creating the tokenizer for an embedded raw-text body definition. */
export type EmbedTokenizerFactory = (def: LanguageDefinition) => TokenizerLike;

/**
 * The language-agnostic tokenizer: one engine, driven entirely by the
 * language definition.
 *
 * Default mode classifies tokens purely from the definition (keywords,
 * booleans, nulls, constants) plus two structural cues shared by most
 * languages — an identifier followed by `(` is a function, and an identifier
 * after `.`/`?.` is a property. It applies no JavaScript semantics (arrows,
 * destructuring, classes, imports), so custom languages get sensible
 * highlighting instead of JavaScript's.
 *
 * With `markup: { tags: true }` in the definition, it switches HTML/XML-like
 * languages to structural scanning: tag names emit `tag`, attribute names
 * `attribute`, text content `text`; `markup.embed` maps raw-text elements
 * (`script`, `style`) to another definition whose tokenizer runs on the body.
 *
 * The JavaScript-specific `Tokenizer` subclasses this and layers context
 * semantics on top of the shared base.
 */
export class GenericTokenizer implements TokenizerLike {
  readonly language: LanguageDefinition;
  protected lexer: Lexer;
  protected keywords: Set<string>;
  protected booleans: Set<string>;
  protected nulls: Set<string>;
  protected constants: Set<string>;
  #markup: MarkupConfig | undefined;
  #embedFactory?: EmbedTokenizerFactory;
  #embedded = new Map<LanguageDefinition, TokenizerLike>();
  protected sigIndex: Int32Array = new Int32Array(1);

  constructor(language: LanguageDefinition, embedFactory?: EmbedTokenizerFactory) {
    this.language = language;
    this.#markup = language.markup;
    this.#embedFactory = embedFactory;
    this.lexer = new Lexer(language);
    const fold = language.caseInsensitive ? (w: string) => w.toLowerCase() : (w: string) => w;
    this.keywords = new Set((language.keywords ?? []).map(fold));
    this.booleans = new Set((language.booleans ?? []).map(fold));
    this.nulls = new Set((language.nulls ?? []).map(fold));
    this.constants = new Set((language.constants ?? []).map(fold));
  }

  tokenize(source: string): Token[] {
    if (this.#markup?.tags) return this.#scanMarkup(source);
    return this.#scanCode(source);
  }

  #scanCode(source: string): Token[] {
    const raws = this.lexer.tokenize(source);
    this.buildSigIndex(raws);
    const out: Token[] = [];
    let expectProperty = false;

    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];

      if (raw.type === "whitespace") {
        out.push(createToken(WHITESPACE, raw.start, raw.end));
        continue;
      }

      // Member access binds to the very next significant token; anything
      // else clears it, so `obj. 1 later` cannot mark `later` a property.
      const wasProperty = expectProperty;
      expectProperty = false;

      switch (raw.type) {
        case "identifier": {
          if (wasProperty) {
            out.push(createToken(TokenType.PROPERTY, raw.start, raw.end));
            break;
          }
          const val = this.language.caseInsensitive ? raw.value.toLowerCase() : raw.value;
          if (this.keywords.has(val)) {
            out.push(createToken(TokenType.KEYWORD, raw.start, raw.end));
          } else if (this.nulls.has(val)) {
            out.push(createToken(TokenType.NULL, raw.start, raw.end));
          } else if (this.booleans.has(val)) {
            out.push(createToken(TokenType.BOOLEAN, raw.start, raw.end));
          } else if (this.constants.has(val) || CONSTANT_RE.test(val)) {
            out.push(createToken(TokenType.CONSTANT, raw.start, raw.end));
          } else {
            const nxt = this.nextSig(raws, i);
            if (nxt?.type === "punctuation" && nxt.value === "(") {
              out.push(createToken(TokenType.FUNCTION, raw.start, raw.end));
            } else {
              out.push(createToken(TokenType.VARIABLE, raw.start, raw.end));
            }
          }
          break;
        }
        case "number":
          out.push(createToken(TokenType.NUMBER, raw.start, raw.end));
          break;
        case "string":
          out.push(createToken(TokenType.STRING, raw.start, raw.end));
          break;
        case "regex":
          out.push(createToken(TokenType.REGEX, raw.start, raw.end));
          break;
        case "comment":
          out.push(createToken(TokenType.COMMENT, raw.start, raw.end));
          break;
        case "decorator":
          out.push(createToken(TokenType.DECORATOR, raw.start, raw.end));
          break;
        case "operator":
          expectProperty = raw.value === "?.";
          out.push(createToken(TokenType.OPERATOR, raw.start, raw.end));
          break;
        case "punctuation":
          expectProperty = raw.value === ".";
          out.push(createToken(TokenType.PUNCTUATION, raw.start, raw.end));
          break;
        default:
          out.push(createToken(TokenType.IDENTIFIER, raw.start, raw.end));
      }
    }

    return out;
  }

  // ------------------------------------------------------- markup scanning

  /**
   * Structural scan for HTML/XML-like definitions (`markup: { tags: true }`).
   * Runs directly over the source rather than the lexer's raw stream, so tag
   * structure (open/close/self-closing, raw-text embedding) is explicit.
   */
  #scanMarkup(source: string): Token[] {
    const out: Token[] = [];
    const len = source.length;
    let i = 0;
    const push = (type: Token["type"], start: number, end: number): void => {
      if (end > start) out.push(createToken(type, start, end));
    };

    while (i < len) {
      if (source.startsWith("<!--", i)) {
        const close = source.indexOf("-->", i + 4);
        const stop = close === -1 ? len : close + 3;
        push(TokenType.COMMENT, i, stop);
        i = stop;
        continue;
      }

      if (source[i] !== "<") {
        let j = i + 1;
        while (j < len && source[j] !== "<") j += 1;
        push(TokenType.TEXT, i, j);
        i = j;
        continue;
      }

      // `<!doctype …>` / `<![CDATA[…]]>` / `<?xml … ?>`
      if (source.startsWith("<!", i)) {
        i = this.#scanBang(source, i, push, ">");
        continue;
      }
      if (source.startsWith("<?", i)) {
        i = this.#scanBang(source, i, push, "?>");
        continue;
      }

      // Closing tag: `</name>`
      if (source.startsWith("</", i)) {
        push(TokenType.PUNCTUATION, i, i + 2);
        i += 2;
        NAME_RE.lastIndex = i;
        const m = NAME_RE.exec(source);
        if (m && m.index === i) {
          push(TokenType.TAG, m.index, m.index + m[0].length);
          i = m.index + m[0].length;
        }
        i = this.#skipToClose(source, i, push);
        continue;
      }

      // Opening tag — requires a name, otherwise the `<` is plain text.
      NAME_RE.lastIndex = i + 1;
      const m = NAME_RE.exec(source);
      if (!m || m.index !== i + 1) {
        push(TokenType.TEXT, i, i + 1);
        i += 1;
        continue;
      }

      push(TokenType.PUNCTUATION, i, i + 1);
      const tagName = m[0].toLowerCase();
      push(TokenType.TAG, m.index, m.index + m[0].length);
      i = m.index + m[0].length;

      let selfClosing = false;
      while (i < len) {
        WS_RE.lastIndex = i;
        const ws = WS_RE.exec(source);
        if (ws && ws.index === i) {
          push(WHITESPACE, i, i + ws[0].length);
          i += ws[0].length;
          if (i >= len) break;
        }
        const ch = source[i];
        if (ch === ">") {
          push(TokenType.PUNCTUATION, i, i + 1);
          i += 1;
          break;
        }
        if (ch === "/" && source[i + 1] === ">") {
          push(TokenType.PUNCTUATION, i, i + 2);
          i += 2;
          selfClosing = true;
          break;
        }
        if (ch === "=") {
          push(TokenType.OPERATOR, i, i + 1);
          i += 1;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const close = source.indexOf(ch, i + 1);
          const stop = close === -1 ? len : close + 1;
          push(TokenType.STRING, i, stop);
          i = stop;
          continue;
        }
        ATTR_NAME_RE.lastIndex = i;
        const attr = ATTR_NAME_RE.exec(source);
        if (attr && attr.index === i) {
          push(TokenType.ATTRIBUTE, i, i + attr[0].length);
          i += attr[0].length;
          continue;
        }
        if (ch === "<") {
          push(TokenType.TEXT, i, i + 1);
          i += 1;
          continue;
        }
        // Unquoted attribute value or stray character.
        let j = i + 1;
        while (j < len && !/[\s=>"'<]/.test(source[j])) j += 1;
        push(TokenType.STRING, i, j);
        i = j;
      }

      if (!selfClosing) i = this.#maybeEmbed(source, i, tagName, push);
    }

    return out;
  }

  /** If `tagName` is a configured raw-text element, tokenize its body via the embedded definition. */
  #maybeEmbed(
    source: string,
    start: number,
    tagName: string,
    push: (type: Token["type"], s: number, e: number) => void,
  ): number {
    const embedDef = this.#markup?.embed?.[tagName];
    const len = source.length;
    const closeRe = new RegExp(`</${tagName}(?=[\\s/>]|$)`, "i");
    closeRe.lastIndex = start;
    const hit = closeRe.exec(source);
    const bodyEnd = hit ? hit.index : len;

    if (embedDef && bodyEnd > start) {
      let embed = this.#embedded.get(embedDef);
      if (!embed) {
        embed = this.#embedFactory?.(embedDef);
        if (embed) this.#embedded.set(embedDef, embed);
      }
      if (embed) {
        for (const tok of embed.tokenize(source.slice(start, bodyEnd))) {
          push(tok.type, tok.start + start, tok.end + start);
        }
        return bodyEnd;
      }
    }
    // Not an embedded element (or no factory): leave the body as plain text.
    if (!hit) return bodyEnd;
    push(TokenType.TEXT, start, bodyEnd);
    return bodyEnd;
  }

  /** `<!doctype html>`, `<![CDATA[…]]>`, `<?xml … ?>` — keyword for names, rest plain. */
  #scanBang(
    source: string,
    start: number,
    push: (type: Token["type"], s: number, e: number) => void,
    terminator: ">" | "?>",
  ): number {
    const len = source.length;
    let i = start + 2;
    push(TokenType.PUNCTUATION, start, i);

    if (source.startsWith("[CDATA[", i)) {
      const close = source.indexOf("]]>", i);
      const stop = close === -1 ? len : close + 3;
      push(TokenType.TEXT, i, stop);
      return stop;
    }

    while (i < len) {
      if (source.startsWith(terminator, i)) {
        push(TokenType.PUNCTUATION, i, i + terminator.length);
        return i + terminator.length;
      }
      const ch = source[i];
      if (ch === "-" && source.startsWith("-->", i)) {
        push(TokenType.PUNCTUATION, i, i + 3);
        return i + 3;
      }
      if (/\s/.test(ch)) {
        let j = i;
        while (j < len && /\s/.test(source[j])) j += 1;
        push(WHITESPACE, i, j);
        i = j;
        continue;
      }
      ATTR_NAME_RE.lastIndex = i;
      const word = ATTR_NAME_RE.exec(source);
      if (word && word.index === i) {
        push(TokenType.KEYWORD, i, i + word[0].length);
        i += word[0].length;
        continue;
      }
      push(TokenType.TEXT, i, i + 1);
      i += 1;
    }
    return i;
  }

  /** Consume up to and including the closing `>` of a tag's tail (`… >`). */
  #skipToClose(
    source: string,
    start: number,
    push: (type: Token["type"], s: number, e: number) => void,
  ): number {
    const len = source.length;
    let i = start;
    while (i < len && /\s/.test(source[i])) i += 1;
    if (i > start) push(WHITESPACE, start, i);
    if (i < len && source[i] === ">") {
      push(TokenType.PUNCTUATION, i, i + 1);
      return i + 1;
    }
    // Malformed tail — consume through the next `>` (or EOF) as plain text.
    const gt = source.indexOf(">", i);
    const stop = gt === -1 ? len : gt + 1;
    if (stop > i) push(TokenType.TEXT, i, stop);
    return stop;
  }

  /**
   * `#sigIndex[i]` is the first index >= i holding a significant token —
   * neither whitespace nor a comment — or `raws.length` when there is none.
   * Built once per tokenize() so lookahead is O(1) rather than a fresh scan
   * per identifier, and so a comment between two tokens is transparent
   * (`foo /* c *\/ ()` still reads as a call).
   */
  protected buildSigIndex(raws: RawToken[]): void {
    const next = new Int32Array(raws.length + 1);
    next[raws.length] = raws.length;
    for (let i = raws.length - 1; i >= 0; i--) {
      const type = raws[i].type;
      next[i] = type === WHITESPACE || type === "comment" ? next[i + 1]! : i;
    }
    this.sigIndex = next;
  }

  protected nextSig(raws: RawToken[], idx: number): RawToken | null {
    const i = this.sigIndex[idx + 1] ?? raws.length;
    return i < raws.length ? raws[i] : null;
  }
}
