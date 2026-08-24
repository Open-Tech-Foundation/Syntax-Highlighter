import { type Token, TokenType, WHITESPACE } from "./tokens.ts";

export const HIGHLIGHTABLE: Set<string> = new Set<string>(Object.values(TokenType));

export function isValidToken(token: unknown): token is Token {
  if (token == null || typeof token !== "object") return false;
  const t = token as Record<string, unknown>;
  return (
    typeof t.start === "number" &&
    typeof t.end === "number" &&
    typeof t.type === "string" &&
    Number.isInteger(t.start) &&
    Number.isInteger(t.end)
  );
}

export function getSortedValidTokens(tokens: Token[]): Token[] {
  return [...tokens].filter(isValidToken).sort((a, b) => a.start - b.start);
}

export type GapOrToken =
  | { kind: "gap"; text: string }
  | { kind: "token"; text: string; token: Token };

/**
 * Iterate tokens with gap handling.
 * Skips out-of-bounds, empty, and overlapping tokens; yields gaps as plain text.
 */
export function* iterateTokens(source: string, tokens: Token[]): Generator<GapOrToken> {
  const sorted = getSortedValidTokens(tokens);
  let pos = 0;
  for (const token of sorted) {
    if (token.start < 0 || token.end > source.length || token.end <= token.start) continue;
    if (token.start < pos) continue;
    if (token.start > pos) {
      yield { kind: "gap", text: source.slice(pos, token.start) };
      pos = token.start;
    }
    yield { kind: "token", text: source.slice(token.start, token.end), token };
    pos = token.end;
  }
  if (pos < source.length) {
    yield { kind: "gap", text: source.slice(pos) };
  }
}

export { WHITESPACE };
