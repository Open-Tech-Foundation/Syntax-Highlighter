import { assert, assertEquals, test } from "runtime:test";
import { validateTokens } from "../src/core/json-renderer.ts";
import { UnifiedTokenizer } from "../src/core/unified-tokenizer.ts";
import markdown from "../src/languages/markdown.ts";

const tokenizer = new UnifiedTokenizer(markdown);

/** `semantic-or-type:text` for every non-whitespace token. */
function parts(src) {
  const tokens = tokenizer.tokenize(src);
  validateTokens(src, tokens);
  return tokens
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.semantic ?? t.type}:${src.slice(t.start, t.end)}`);
}

const emphasized = (src) => parts(src).filter((p) => p.startsWith("text."));

test("a list marker followed by bold is a list item, not italic", () => {
  const out = parts("* **Declarative:** React makes it painless");
  assertEquals(out.slice(0, 4), [
    "markup.list:* ",
    "text.bold:**",
    "text.bold:Declarative:",
    "text.bold:**",
  ]);
  assert(!out.some((p) => p.startsWith("text.italic")), JSON.stringify(out));
});

test("emphasis must hug its content (CommonMark flanking)", () => {
  assertEquals(emphasized("2 * 3 * 4"), []);
  assertEquals(emphasized("a ** b ** c"), []);
  assertEquals(emphasized("*real* italic"), ["text.italic:*", "text.italic:real", "text.italic:*"]);
});

test("underscores inside words are not emphasis", () => {
  assertEquals(emphasized("call snake_case_name or __init__ here"), [
    "text.bold:__",
    "text.bold:init",
    "text.bold:__",
  ]);
  assertEquals(emphasized("my_var_name"), []);
});

test("an unmatched delimiter is literal text, not emphasis to end of line", () => {
  assertEquals(emphasized("costs *5 per item"), []);
  assertEquals(emphasized("**bold without close"), []);
});

test("headings keep links, code, and emphasis inside them", () => {
  const out = parts("# [React](https://react.dev/) uses `jsx` and *style*");
  assertEquals(out[0], "markup.heading:# ");
  for (const expected of [
    "markup.link:[React](https://react.dev/)",
    "markup.heading:uses",
    "code.inline:`jsx`",
    "text.italic:style",
  ]) {
    assert(out.includes(expected), `expected ${expected} in ${JSON.stringify(out)}`);
  }
});

test("a heading's plain words are all heading, and it ends at the line", () => {
  const out = parts("## Getting started\nbody text");
  assertEquals(out.slice(0, 3), [
    "markup.heading:## ",
    "markup.heading:Getting",
    "markup.heading:started",
  ]);
  assert(!out.some((p) => p.startsWith("markup.heading:body")), JSON.stringify(out));
});

test("README badges: a linked image is one link", () => {
  const src = "[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://x/LICENSE)";
  assertEquals(parts(src), [`markup.link:${src}`]);
});

test("quotes and apostrophes in prose are text, not strings", () => {
  const out = parts(`Don't "quote" me`);
  assert(!out.some((p) => p.startsWith("string:")), JSON.stringify(out));
});

test("inline code still works", () => {
  assert(parts("use `npm ci` here").includes("code.inline:`npm ci`"));
});
