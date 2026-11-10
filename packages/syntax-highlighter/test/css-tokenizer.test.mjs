import { assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { validateTokens } from "../src/core/json-renderer.ts";
import css from "../src/languages/css.ts";
import html from "../src/languages/html.ts";

const highlighter = new Highlighter(css);

/** `type:text` for every non-whitespace token. */
function kinds(src, h = highlighter) {
  const tokens = h.highlight(src);
  validateTokens(src, tokens);
  return tokens
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
}

function has(src, expected, h = highlighter) {
  const actual = kinds(src, h);
  for (const e of expected) {
    if (!actual.includes(e)) throw new Error(`expected ${e} in ${JSON.stringify(actual)}`);
  }
}

test("selectors: elements are tags; classes, ids, and pseudos are attributes", () => {
  assertEquals(kinds("main > a.btn:hover::before, #nav * {}"), [
    "tag:main",
    "operator:>",
    "tag:a",
    "attribute:.",
    "attribute:btn",
    "attribute::",
    "attribute:hover",
    "attribute:::",
    "attribute:before",
    "punctuation:,",
    "attribute:#",
    "attribute:nav",
    "tag:*",
    "punctuation:{",
    "punctuation:}",
  ]);
});

test("attribute selectors: name is an attribute, unquoted value a string", () => {
  has('input[type="text"], a[target=_blank] {}', [
    "attribute:type",
    'string:"text"',
    "attribute:target",
    "string:_blank",
  ]);
});

test("an id that looks like a hex color is still an id in a selector", () => {
  has("#fade { color: #fade; }", ["attribute:#fade", "constant:#fade"]);
});

test("declarations: property names, values, units, colors, !important", () => {
  assertEquals(kinds("a { margin: -0.5rem 50% 0; color: #fff !important; }"), [
    "tag:a",
    "punctuation:{",
    "property:margin",
    "operator::",
    "number:-0.5rem",
    "number:50%",
    "number:0",
    "punctuation:;",
    "property:color",
    "operator::",
    "constant:#fff",
    "keyword:!",
    "keyword:important",
    "punctuation:;",
    "punctuation:}",
  ]);
});

test("custom properties stay variables; value words are never keywords", () => {
  has(":root { --gap: 1rem; display: flex; container: layout; }", [
    "variable:--gap",
    "property:display",
    "variable:flex",
    "property:container",
    "variable:layout",
  ]);
});

test("functions in values keep their function type", () => {
  has("a { color: rgb(0 0 0 / 50%); width: calc(100% - var(--gap)); }", [
    "function:rgb",
    "function:calc",
    "function:var",
    "number:100%",
  ]);
});

test("a pseudo-class selector is not mistaken for a declaration", () => {
  has("a:hover { color: red }", ["tag:a", "attribute:hover", "property:color"]);
});

test("the last declaration may omit its semicolon", () => {
  has("a { color: red }", ["property:color", "variable:red"]);
});

test("at-rules: keyword, media features, and word operators", () => {
  has("@media screen and (max-width: 768px) { .a { color: red; } }", [
    "keyword:@media",
    "keyword:and",
    "property:max-width",
    "number:768px",
    "attribute:a",
    "property:color",
  ]);
});

test("keyframe offsets are not selectors", () => {
  const out = kinds("@keyframes fade { from { opacity: 0; } to { opacity: 1; } }");
  for (const word of ["from", "to"]) {
    if (out.includes(`tag:${word}`)) throw new Error(`${word} classified as a tag: ${out}`);
  }
  has("@keyframes fade { from { opacity: 0; } }", ["keyword:@keyframes", "property:opacity"]);
});

test("@font-face blocks hold declarations", () => {
  has('@font-face { font-family: "Inter"; src: url(a.woff2); }', [
    "keyword:@font-face",
    "property:font-family",
    "property:src",
  ]);
});

test("nested rules: & is a tag, inner declarations are properties", () => {
  has(".card { &:hover { color: red; } padding: 1rem; }", [
    "tag:&",
    "attribute:hover",
    "property:color",
    "property:padding",
  ]);
});

test("comments are left alone", () => {
  has("/* a { b: c } */ a { color: red; }", ["comment:/* a { b: c } */", "property:color"]);
});

test("HTML <style> blocks get the same structure", () => {
  has(
    "<style>.x { color: red; }</style>",
    ["attribute:x", "property:color"],
    new Highlighter(html),
  );
});

test("unterminated input still satisfies the token contract", () => {
  for (const src of ["a {", "a { color:", ".x:", "@media (", "#", "a { color: #ff"]) kinds(src);
});
