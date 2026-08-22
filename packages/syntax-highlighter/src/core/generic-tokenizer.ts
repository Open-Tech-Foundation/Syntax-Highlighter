import { Lexer, type LanguageDefinition, type RawToken } from "./lexer.ts";
import { TokenType, WHITESPACE, createToken, type Token } from "./tokens.ts";

const CONSTANT_RE = /^[A-Z][A-Z0-9_$]*$/;

/**
 * The language-agnostic tokenizer: it classifies tokens purely from the
 * language definition (keywords, booleans, nulls, constants) plus two
 * structural cues shared by most languages — an identifier followed by `(` is
 * a function, and an identifier after `.`/`?.` is a property.
 *
 * Unlike the JavaScript-specific `Tokenizer`, it applies no JavaScript
 * semantics (arrows, destructuring, classes, imports, parameters), so custom
 * languages get sensible highlighting instead of JavaScript's.
 */
export class GenericTokenizer {
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
          const val = raw.value;
          if (this.keywords.has(val)) {
            out.push(createToken(TokenType.KEYWORD, raw.start, raw.end));
          } else if (this.nulls.has(val)) {
            out.push(createToken(TokenType.NULL, raw.start, raw.end));
          } else if (this.booleans.has(val)) {
            out.push(createToken(TokenType.BOOLEAN, raw.start, raw.end));
          } else if (this.constants.has(val) || CONSTANT_RE.test(val)) {
            out.push(createToken(TokenType.CONSTANT, raw.start, raw.end));
          } else {
            const nxt = this.#nextSig(raws, i);
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
}
