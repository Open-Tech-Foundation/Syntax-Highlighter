export interface TokenTypeConst {
  readonly KEYWORD: "keyword";
  readonly IDENTIFIER: "identifier";
  readonly FUNCTION: "function";
  readonly CLASS: "class";
  readonly PARAMETER: "parameter";
  readonly PROPERTY: "property";
  readonly KEY: "key";
  readonly VARIABLE: "variable";
  readonly CONSTANT: "constant";
  readonly NUMBER: "number";
  readonly STRING: "string";
  readonly COMMENT: "comment";
  readonly REGEX: "regex";
  readonly OPERATOR: "operator";
  readonly PUNCTUATION: "punctuation";
  readonly DECORATOR: "decorator";
  readonly BOOLEAN: "boolean";
  readonly NULL: "null";
  readonly TAG: "tag";
  readonly ATTRIBUTE: "attribute";
  readonly TEXT: "text";
}

export const TokenType: TokenTypeConst = Object.freeze({
  KEYWORD: "keyword",
  IDENTIFIER: "identifier",
  FUNCTION: "function",
  CLASS: "class",
  PARAMETER: "parameter",
  PROPERTY: "property",
  KEY: "key",
  VARIABLE: "variable",
  CONSTANT: "constant",
  NUMBER: "number",
  STRING: "string",
  COMMENT: "comment",
  REGEX: "regex",
  OPERATOR: "operator",
  PUNCTUATION: "punctuation",
  DECORATOR: "decorator",
  BOOLEAN: "boolean",
  NULL: "null",
  TAG: "tag",
  ATTRIBUTE: "attribute",
  TEXT: "text",
});

export type TokenType = TokenTypeConst[keyof TokenTypeConst];

export const WHITESPACE = "whitespace";

export type Token = {
  type: TokenType | typeof WHITESPACE;
  start: number;
  end: number;
};

export function createToken(type: Token["type"], start: number, end: number): Token {
  return { type, start, end };
}

export function isSignificant(token: Token | null | undefined): boolean {
  return token != null && token.type !== WHITESPACE;
}
