import { Tokenizer } from "./tokenizer.ts";
import type { LanguageDefinition } from "./lexer.ts";
import type { Token } from "./tokens.ts";

export class Highlighter {
  language: LanguageDefinition;
  tokenizer: Tokenizer;

  constructor(language: LanguageDefinition) {
    if (!language || typeof language !== "object") {
      throw new Error("Highlighter requires a language definition object");
    }
    this.language = language;
    this.tokenizer = new Tokenizer(language);
  }

  highlight(source: string): Token[] {
    return this.tokenizer.tokenize(source);
  }
}
