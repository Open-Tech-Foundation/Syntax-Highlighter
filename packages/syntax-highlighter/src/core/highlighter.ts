import type { LanguageDefinition } from "./lexer.ts";
import type { Token } from "./tokens.ts";
import { UnifiedTokenizer } from "./unified-tokenizer.ts";

export class Highlighter {
  readonly language: LanguageDefinition;
  readonly tokenizer: UnifiedTokenizer;

  constructor(language: LanguageDefinition) {
    if (!language || typeof language !== "object") {
      throw new Error("Highlighter requires a language definition object");
    }
    this.language = language;
    this.tokenizer = new UnifiedTokenizer(language);
  }

  highlight(source: string): Token[] {
    if (typeof source !== "string") throw new TypeError("source must be a string");
    return this.tokenizer.tokenize(source);
  }
}
