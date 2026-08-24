import {
  GenericTokenizer,
  type EmbedTokenizerFactory,
  type TokenizerLike,
} from "./generic-tokenizer.ts";
import type { LanguageDefinition } from "./lexer.ts";
import { Tokenizer } from "./tokenizer.ts";
import type { Token } from "./tokens.ts";

/**
 * Single dispatch point: a definition gets the JS-aware subclass when it opts
 * into `semantic: "javascript"`, otherwise the generic engine (which may run
 * its markup scanner when `markup.tags` is set). The factory recurses so
 * embedded raw-text bodies (`markup.embed`) resolve through the same rule.
 */
export const createTokenizer: EmbedTokenizerFactory = (
  language: LanguageDefinition,
): TokenizerLike =>
  language.semantic === "javascript"
    ? new Tokenizer(language)
    : new GenericTokenizer(language, createTokenizer);

export class Highlighter {
  readonly language: LanguageDefinition;
  readonly tokenizer: TokenizerLike;

  constructor(language: LanguageDefinition) {
    if (!language || typeof language !== "object") {
      throw new Error("Highlighter requires a language definition object");
    }
    this.language = language;
    this.tokenizer = createTokenizer(language);
  }

  highlight(source: string): Token[] {
    return this.tokenizer.tokenize(source);
  }
}
