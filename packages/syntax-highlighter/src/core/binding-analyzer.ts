import type { RawToken } from "./lexer.ts";

const CONTROL_HEADER_KEYWORDS = new Set(["if", "for", "while", "switch", "with"]);

export function analyzeBindings(
  raws: RawToken[],
  sigIndex: Int32Array,
): {
  parens: Map<number, number>;
  parameterBindings: Set<number>;
} {
  const parens = new Map<number, number>();
  const parameterBindings = new Set<number>();
  const stack: number[] = [];
  const prevStack: number[] = [];
  let prevSig = -1;

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i];
    if (raw.type === "whitespace") continue;
    if (raw.type !== "punctuation") {
      prevSig = i;
      continue;
    }
    if (raw.value === "(") {
      stack.push(i);
      prevStack.push(prevSig);
      prevSig = i;
      continue;
    }
    if (raw.value === ")") {
      const open = stack.pop();
      const prevAtOpen = prevStack.pop();
      if (open != null && prevAtOpen !== undefined) {
        parens.set(open, i);
        let afterIdx = sigIndex[i + 1] ?? raws.length;
        // See through a TS return annotation: `(...): Type =>` / `(...): Type {`
        if (raws[afterIdx]?.value === ":") {
          afterIdx =
            sigIndex[skipTypeAnnotation(raws, afterIdx + 1, raws.length, true)] ?? raws.length;
        }
        const after = afterIdx < raws.length ? raws[afterIdx] : null;
        const previous = effectiveHeaderPrev(raws, prevAtOpen, sigIndex);
        const isArrow = after?.value === "=>";
        const isBodyHeader =
          after?.value === "{" &&
          previous != null &&
          previous.type === "identifier" &&
          !CONTROL_HEADER_KEYWORDS.has(previous.value);
        if (isArrow || isBodyHeader) {
          collectBindings(raws, open + 1, i, parameterBindings, sigIndex);
        }
      }
      prevSig = i;
      continue;
    }
    prevSig = i;
  }

  return { parens, parameterBindings };
}

function effectiveHeaderPrev(
  raws: RawToken[],
  prevIdx: number,
  _sigIndex: Int32Array,
): RawToken | null {
  if (prevIdx < 0) return null;
  let i = prevIdx;
  if (raws[i].value === ">" || raws[i].value === ">>" || raws[i].value === ">>>") {
    let depth = 0;
    while (i >= 0) {
      const v = raws[i].value;
      if (v === ">") depth += 1;
      else if (v === ">>") depth += 2;
      else if (v === ">>>") depth += 3;
      else if (v === "<") {
        depth -= 1;
        if (depth <= 0) break;
      } else if (v === "<<") {
        depth -= 2;
        if (depth <= 0) break;
      }
      i -= 1;
    }
    i = prevSigIndex(raws, i - 1);
  }
  return i >= 0 ? raws[i] : null;
}

function collectBindings(
  raws: RawToken[],
  start: number,
  end: number,
  bindings: Set<number>,
  sigIndex: Int32Array,
): void {
  let i = sigIndex[start] ?? raws.length;
  while (i < end) {
    i = parseBinding(raws, i, end, bindings, sigIndex);
    i = sigIndex[i] ?? raws.length;
    if (raws[i]?.value === ",") i = sigIndex[i + 1] ?? raws.length;
    else if (i < end) i += 1;
  }
}

function parseBinding(
  raws: RawToken[],
  index: number,
  end: number,
  bindings: Set<number>,
  sigIndex: Int32Array,
): number {
  const i = sigIndex[index] ?? raws.length;
  if (i >= end) return i;
  const token = raws[i];

  if (token.type === "operator" && token.value === "...") {
    return parseBinding(raws, i + 1, end, bindings, sigIndex);
  }
  if (token.type === "punctuation" && token.value === "{") {
    return parseObjectBinding(raws, i, end, bindings, sigIndex);
  }
  if (token.type === "punctuation" && token.value === "[") {
    return parseArrayBinding(raws, i, end, bindings, sigIndex);
  }
  if (token.type === "identifier") {
    bindings.add(i);
    const next = sigIndex[i + 1] ?? raws.length;
    const nraw = raws[next];
    if (nraw?.value === "=") {
      return skipDefault(raws, next + 1, end, new Set([",", ")"]), sigIndex);
    }
    if (nraw?.value === "?") {
      const colonIdx = sigIndex[next + 1] ?? raws.length;
      if (raws[colonIdx]?.value === ":") {
        return skipTypeAnnotation(raws, colonIdx + 1, end);
      }
      return next;
    }
    if (nraw?.value === ":") {
      return skipTypeAnnotation(raws, next + 1, end);
    }
    return next;
  }
  return skipDefault(raws, i + 1, end, new Set([",", ")"]), sigIndex);
}

function parseObjectBinding(
  raws: RawToken[],
  open: number,
  end: number,
  bindings: Set<number>,
  sigIndex: Int32Array,
): number {
  let i = sigIndex[open + 1] ?? raws.length;
  while (i < end && raws[i].value !== "}") {
    if (raws[i].type === "operator" && raws[i].value === "...") {
      i = parseBinding(raws, i + 1, end, bindings, sigIndex);
    } else if (raws[i].value === "[") {
      i = skipBalanced(raws, i, end, "[", "]");
      i = sigIndex[i] ?? raws.length;
      if (raws[i]?.value === ":") {
        i = parseBinding(raws, i + 1, end, bindings, sigIndex);
      }
    } else if (raws[i].type === "identifier") {
      const key = i;
      const next = sigIndex[i + 1] ?? raws.length;
      if (raws[next]?.value === ":") {
        i = parseBinding(raws, next + 1, end, bindings, sigIndex);
      } else {
        bindings.add(key);
        i =
          raws[next]?.value === "="
            ? skipDefault(raws, next + 1, end, new Set([",", "}"]), sigIndex)
            : next;
      }
    } else {
      i += 1;
    }
    i = sigIndex[i] ?? raws.length;
    if (raws[i]?.value === ",") i = sigIndex[i + 1] ?? raws.length;
  }
  return i < end ? i + 1 : i;
}

function parseArrayBinding(
  raws: RawToken[],
  open: number,
  end: number,
  bindings: Set<number>,
  sigIndex: Int32Array,
): number {
  let i = sigIndex[open + 1] ?? raws.length;
  while (i < end && raws[i].value !== "]") {
    if (raws[i].value === ",") {
      i = sigIndex[i + 1] ?? raws.length;
      continue;
    }
    i = parseBinding(raws, i, end, bindings, sigIndex);
    i = sigIndex[i] ?? raws.length;
    if (raws[i]?.value === ",") i = sigIndex[i + 1] ?? raws.length;
  }
  return i < end ? i + 1 : i;
}

function skipDefault(
  raws: RawToken[],
  index: number,
  end: number,
  stops: Set<string>,
  sigIndex: Int32Array,
): number {
  let i = sigIndex[index] ?? raws.length;
  let depth = 0;
  while (i < end) {
    const value = raws[i].value;
    if (value === "(" || value === "[" || value === "{") depth += 1;
    else if (value === ")" || value === "]" || value === "}") {
      if (depth === 0 && stops.has(value)) return i;
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && stops.has(value)) {
      return i;
    }
    i = sigIndex[i + 1] ?? raws.length;
  }
  return i;
}

function skipBalanced(
  raws: RawToken[],
  open: number,
  end: number,
  opening: string,
  closing: string,
): number {
  let depth = 0;
  let i = open;
  while (i < end) {
    if (raws[i].value === opening) depth += 1;
    else if (raws[i].value === closing) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return i;
}

export function skipTypeAnnotation(
  raws: RawToken[],
  start: number,
  end: number,
  stopArrows = false,
): number {
  let depth = 0;
  let i = start;
  while (i < end) {
    const v = raws[i].value;
    if (
      depth === 0 &&
      (v === "," ||
        v === ")" ||
        v === "]" ||
        v === "}" ||
        (stopArrows && (v === "=>" || v === "{")))
    ) {
      return i;
    }
    if (v === "(" || v === "[" || v === "{" || v === "<") depth += 1;
    else if ((v === ">" || v === ">>" || v === ">>>") && depth > 0) {
      depth = Math.max(0, depth - v.length);
    }
    i += 1;
  }
  return i;
}

export function isTypeAliasName(raws: RawToken[], idx: number, sigIndex: Int32Array): boolean {
  const i = sigIndex[idx + 1] ?? raws.length;
  const nxt = i < raws.length ? raws[i] : null;
  if (!nxt) return false;
  return nxt.type === "operator" && (nxt.value === "=" || nxt.value === "<");
}

function prevSigIndex(raws: RawToken[], idx: number): number {
  for (let i = Math.min(idx, raws.length - 1); i >= 0; i--) {
    const type = raws[i].type;
    if (type !== "whitespace" && type !== "comment") return i;
  }
  return -1;
}
