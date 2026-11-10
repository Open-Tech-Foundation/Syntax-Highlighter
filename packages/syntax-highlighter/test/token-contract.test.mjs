/**
 * Token contract across every built-in language.
 *
 * `validateTokens` enforces the public guarantee: tokens are non-empty,
 * sorted, contiguous, and cover the whole source. Inputs here are the kind
 * real documents and half-typed code contain — unterminated constructs,
 * back-to-back interpolations, mixed newlines, astral characters — run
 * through every language, since a lexer path shared by all of them can break
 * the contract for any one.
 */

import { assert, assertEquals, test } from "runtime:test";
import { createHighlighter, getRegisteredLanguages, validateTokens } from "../src/index.ts";

const INPUTS = [
  "",
  "`${a}${b}`",
  "`${",
  "`${a",
  "`${`${",
  "x = `a${b}${c}d`",
  '"#{a}#{b}"',
  '"#{',
  '$"{a}{b}"',
  "'unterminated",
  "/* unterminated",
  "<script>a</script><script>b</script>",
  "a\r\nb\rc\n",
  "\u{1F600} \u00e9 \uFEFF\u00a0",
  'x = \'a\' // c\n/* b */ "s\\"" 12 ${y} `t ${z}` # h\n<a b="c">d</a>\n\t;',
];

const languages = getRegisteredLanguages();

test("every built-in language is checked", () => {
  assert(languages.length >= 101, `expected >= 101 languages, got ${languages.length}`);
});

for (const language of languages) {
  test(`${language}: tokens satisfy the contract for edge-case inputs`, async () => {
    const highlighter = await createHighlighter({ language });
    for (const source of INPUTS) {
      const tokens = highlighter.highlight(source);
      try {
        validateTokens(source, tokens);
      } catch (error) {
        throw new Error(`${language} on ${JSON.stringify(source)}: ${error.message}`);
      }
    }
  });
}

test("back-to-back template interpolations emit no empty string segment", async () => {
  const highlighter = await createHighlighter({ language: "javascript" });
  const src = "`${a}${b}`";
  const parts = highlighter.highlight(src).map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
  assertEquals(parts, [
    "string:`",
    "punctuation:${",
    "variable:a",
    "punctuation:}",
    "punctuation:${",
    "variable:b",
    "punctuation:}",
    "string:`",
  ]);
});

test("an interpolation left open at end of input emits no trailing empty token", async () => {
  const highlighter = await createHighlighter({ language: "typescript" });
  const src = "const s = `${";
  const tokens = highlighter.highlight(src);
  validateTokens(src, tokens);
  const last = tokens[tokens.length - 1];
  assertEquals(src.slice(last.start, last.end), "${");
});
