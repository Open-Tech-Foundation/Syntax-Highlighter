import { Tokenizer } from "./tokenizer.ts";
import { GenericTokenizer } from "./generic-tokenizer.ts";
import type { LanguageDefinition } from "./lexer.ts";
import type { Token } from "./tokens.ts";

export interface TokenizerLike {
  tokenize(source: string): Token[];
}

export class Highlighter {
  readonly language: LanguageDefinition;
  readonly tokenizer: TokenizerLike;

  constructor(language: LanguageDefinition) {
    if (!language || typeof language !== "object") {
      throw new Error("Highlighter requires a language definition object");
    }
    this.language = language;
    this.tokenizer =
      language.semantic === "javascript"
        ? new Tokenizer(language)
        : new GenericTokenizer(language);
  }

  highlight(source: string): Token[] {
    return this.tokenizer.tokenize(source);
  }
}
