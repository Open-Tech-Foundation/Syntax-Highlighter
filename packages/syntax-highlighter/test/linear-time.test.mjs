/**
 * Tokenizing must stay linear in input size, including pathological input.
 *
 * Server-side highlighting of user content makes any quadratic path a
 * denial-of-service vector: before these fixes one 300 KB Markdown line took
 * a minute, and 40 000 unclosed `(a` took two seconds in every language.
 *
 * Absolute timings vary by machine, so each case compares the cost of n
 * repetitions against 4n. Linear work grows ~4×, quadratic ~16×; the
 * threshold sits between with room for noise.
 */

import { assert, test } from "runtime:test";
import { createHighlighter } from "../src/index.ts";

const SCALE = 4;
const MAX_RATIO = 9;

function bestOf(runs, fn) {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

const CASES = [
  // Per-token line-start check scanned back to the line start.
  ["markdown", "a ", 20000, "one long line"],
  ["diff", "a ", 20000, "one long line"],
  // Inline patterns scanned to end of line on every unclosed opener.
  ["markdown", "[", 10000, "unclosed link brackets"],
  ["markdown", "![", 10000, "unclosed image brackets"],
  ["markdown", "<a", 10000, "unclosed inline HTML"],
  // Flanking emphasis searches for a closer; the search is bounded.
  ["markdown", "_a ", 10000, "unmatched underscores"],
  ["markdown", "*a ", 10000, "unmatched asterisks"],
  // Parameter lookup walked the whole context stack per identifier, so any
  // unclosed bracket nesting was quadratic — in Markdown too.
  ["markdown", "[a](", 10000, "unclosed link destinations"],
  ["markdown", "[a][", 10000, "unclosed reference links"],
  ["javascript", "(a ", 10000, "unclosed parentheses"],
  ["python", "(a ", 10000, "unclosed parentheses"],
  // JSX nesting beyond the depth bound is scanned as code, not recursively.
  ["jsx", "<a>", 10000, "unclosed JSX elements"],
  ["jsx", "<a>{", 10000, "unclosed JSX expression containers"],
  // Shell structure walks words and splits interpolated strings.
  ["bash", 'echo "$x ${y}" a ', 5000, "commands with interpolated strings"],
  ["bash", "a ", 20000, "one long command line"],
];

for (const [language, unit, n, label] of CASES) {
  test(`${language}: ${label} tokenize in linear time`, async () => {
    const highlighter = await createHighlighter({ language });
    const small = unit.repeat(n);
    const large = unit.repeat(n * SCALE);
    highlighter.highlight(small); // warm up the JIT
    const tSmall = Math.max(
      bestOf(3, () => highlighter.highlight(small)),
      1,
    );
    const tLarge = bestOf(3, () => highlighter.highlight(large));
    const ratio = tLarge / tSmall;
    assert(
      ratio < MAX_RATIO,
      `${SCALE}× input took ${ratio.toFixed(1)}× longer (${tSmall.toFixed(1)}ms → ${tLarge.toFixed(1)}ms); expected < ${MAX_RATIO}×`,
    );
  });
}
