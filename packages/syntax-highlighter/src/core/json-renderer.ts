import { type Token, TokenType, WHITESPACE } from "./tokens.ts";

const ALLOWED_TYPES = new Set<string>([...Object.values(TokenType), WHITESPACE]);

function isSurrogateSplit(source: string, offset: number): boolean {
  if (offset <= 0 || offset >= source.length) return false;
  const prev = source.charCodeAt(offset - 1);
  const next = source.charCodeAt(offset);
  return prev >= 0xd800 && prev <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
}

export function validateTokens(source: string, tokens: Token[]): void {
  if (typeof source !== "string") {
    throw new TypeError("source must be a string");
  }
  if (!Array.isArray(tokens)) {
    throw new TypeError("tokens must be an array");
  }

  let pos = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as unknown as Record<string, unknown>;
    if (token == null || typeof token !== "object") {
      throw new TypeError(`token at index ${i} must be an object`);
    }

    const keys = Object.keys(token).sort();
    if (keys.length !== 3 || keys[0] !== "end" || keys[1] !== "start" || keys[2] !== "type") {
      throw new Error(
        `token at index ${i} must have exactly {start,end,type} — got ${JSON.stringify(keys)}`,
      );
    }

    const { start, end, type } = token as unknown as Token;

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new TypeError(`token at index ${i} start/end must be integers`);
    }
    if (start < 0 || end < 0 || start >= end || end > source.length) {
      throw new RangeError(
        `token at index ${i} has invalid range [${String(start)},${String(end)}) for source length ${source.length}`,
      );
    }
    if (typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
      throw new TypeError(`token at index ${i} has invalid type ${JSON.stringify(type)}`);
    }
    if ("text" in token || "value" in token || "modifiers" in token) {
      throw new Error(`token at index ${i} must not contain text/value/modifiers`);
    }

    if (isSurrogateSplit(source, start) || isSurrogateSplit(source, end)) {
      throw new RangeError(
        `token at index ${i} splits a surrogate pair at [${String(start)},${String(end)})`,
      );
    }

    if (start !== pos) {
      throw new Error(
        `tokens must be sorted and contiguous: expected start ${pos} at index ${i} but got ${start}`,
      );
    }
    if (end <= start) {
      throw new Error(`token at index ${i} has empty range`);
    }
    // also ensure exclusive end semantics via slice length
    const slice = source.slice(start, end);
    if (slice.length !== end - start) {
      throw new Error(`token at index ${i} slice length mismatch`);
    }

    pos = end;
  }

  if (pos !== source.length) {
    throw new Error(`tokens must cover the entire source: covered ${pos} of ${source.length}`);
  }
}

/**
 * JSON renderer — validates the contract and serializes the token array.
 *
 * Mirrors the minimal token shape:
 *   { start: number, end: number, type: string }
 * where start/end are exclusive UTF-16 offsets and type is semantic.
 * The renderer recovers text with `source.slice(token.start, token.end)` and
 * never stores text inside the token itself.
 */
export function renderJSON(source: string, tokens: Token[]): string {
  validateTokens(source, tokens);
  return JSON.stringify(tokens);
}
