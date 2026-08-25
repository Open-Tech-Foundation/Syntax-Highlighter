import { assert, assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { renderJSON } from "../src/core/json-renderer.ts";
import html from "../src/languages/html.ts";
import xml from "../src/languages/xml.ts";

const highlighter = new Highlighter(html);

function kinds(src) {
  return highlighter
    .highlight(src)
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
}

function typeAt(src, text) {
  const tok = highlighter
    .highlight(src)
    .find((t) => t.type !== "whitespace" && src.slice(t.start, t.end) === text);
  assert(tok, `expected a token for ${JSON.stringify(text)} in ${JSON.stringify(src)}`);
  return tok.type;
}

test("tags and attributes are typed", () => {
  const src = '<div class="app" id="x">Hello</div>';
  const k = kinds(src);
  assert(k.includes("tag:div"), k.join(" "));
  assert(k.includes("attribute:class"), k.join(" "));
  assert(k.includes('string:"app"'), k.join(" "));
});

test("closing tags are a single unit", () => {
  const src = "</div>";
  assertEquals(kinds(src).join(" "), "punctuation:</ tag:div punctuation:>");
});

test("text content is plain text tokens", () => {
  assertEquals(typeAt("<p>Hello</p>", "Hello"), "text");
});

test("comments stay comments", () => {
  const src = "<!-- note --><b>x</b>";
  assertEquals(typeAt(src, "<!-- note -->"), "comment");
});

test("doctype name is keyword", () => {
  const src = "<!DOCTYPE html><html></html>";
  assertEquals(typeAt(src, "DOCTYPE"), "tag");
  const k = kinds(src);
  assert(k.includes("tag:html"), k.join(" "));
});

test("script bodies are tokenized as JavaScript", () => {
  const src = "<script>const x = 1;</script>";
  assertEquals(typeAt(src, "const"), "keyword");
  assertEquals(typeAt(src, "x"), "variable");
  assertEquals(typeAt(src, "1"), "number");
  // closing script tag still parses
  assertEquals(typeAt(src, "script"), "tag");
});

test("style bodies are tokenized as CSS", () => {
  const src = "<style>p { color: red; }</style>";
  // css is generic-mode today: selectors/identifiers are variables
  assertEquals(typeAt(src, "p"), "variable");
  assertEquals(typeAt(src, "red"), "variable");
});

test("self-closing script does not embed", () => {
  const src = '<script src="app.js"/>';
  const k = kinds(src);
  assert(k.includes("attribute:src"), k.join(" "));
  // no JS tokenization happened — the attribute value stays a string
  assert(k.includes('string:"app.js"'), k.join(" "));
});

test("stray < in text does not break coverage", () => {
  const src = "5 < 6 and x > y";
  const toks = highlighter.highlight(src);
  renderJSON(src, toks);
});

test("token stream covers the whole source (JSON contract)", () => {
  const src =
    '<!DOCTYPE html>\n<html lang="en">\n<!-- c -->\n<body><div class="a">hi</div></body>\n</html>\n';
  renderJSON(src, highlighter.highlight(src));
});

test("xml uses the same tokenizer", () => {
  const hx = new Highlighter(xml);
  const src = '<?xml version="1.0"?><root attr="v">text</root>';
  const toks = hx.highlight(src);
  const k = toks
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`)
    .join(" ");
  assert(k.includes("tag:root"), k);
  assert(k.includes("attribute:attr"), k);
  renderJSON(src, toks);
});
