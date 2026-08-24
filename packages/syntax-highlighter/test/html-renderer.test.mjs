import { assert, assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { escapeHtml, renderHTML } from "../src/core/html-renderer.ts";
import javascript from "../src/languages/javascript.ts";

const highlighter = new Highlighter(javascript);

function render(src) {
  return renderHTML(src, highlighter.highlight(src));
}

test("escapeHtml escapes HTML entities", () => {
  assertEquals(
    escapeHtml(`<div class="a" & 'b'>`),
    "&lt;div class=&quot;a&quot; &amp; &#39;b&#39;&gt;",
  );
});

test("renderHTML wraps semantic tokens with sh- prefix", () => {
  const src = "const x = 42;";
  const html = render(src);
  assert(html.includes('<span class="sh-keyword">const</span>'));
  assert(html.includes('<span class="sh-variable">x</span>'));
  assert(html.includes('<span class="sh-number">42</span>'));
  assert(!html.includes('<span class="sh-whitespace"'));
});

test("renderHTML escapes HTML entities", () => {
  const src = "const s = \"<div> & 'x'\";";
  const html = render(src);
  assert(html.includes("&lt;div&gt;"));
  assert(html.includes("&amp;"));
  assert(!html.includes("<div>"));
  assert(html.includes("&quot;") || html.includes("&#39;"));
});

test("renderHTML recovers text via source.slice", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const html = renderHTML(src, toks);
  const text = html
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
  assertEquals(text, src);
});

test("renderHTML handles surrogate pairs", () => {
  const src = "const 𝒜 = 1;";
  const html = render(src);
  assert(html.includes("𝒜"));
  const toks = highlighter.highlight(src);
  const html2 = renderHTML(src, toks);
  assertEquals(
    html2
      .replaceAll(/<[^>]+>/g, "")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&"),
    src,
  );
});

test("renderHTML fills gaps for non-contiguous tokens", () => {
  const src = "const x = 42;";
  const partial = [{ start: 0, end: 5, type: "keyword" }];
  const html = renderHTML(src, partial);
  assert(html.includes('<span class="sh-keyword">const</span>'));
  assert(html.includes("x = 42;"));
});

test("renderHTML custom prefix and wrapWhitespace", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const html = renderHTML(src, toks, { prefix: "tok-" });
  assert(html.includes('<span class="tok-keyword">'));
  const html2 = renderHTML(src, toks, { wrapWhitespace: true });
  assert(html2.includes('<span class="sh-whitespace">'));
});

test("empty source renders empty string", () => {
  assertEquals(renderHTML("", []), "");
});

test("tokens are renderer-agnostic: no DOM Range used", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  for (const t of toks) {
    assertEquals(Object.keys(t).sort(), ["end", "start", "type"]);
    assert(!("text" in t));
  }
  const html = renderHTML(src, toks);
  assert(html.length > 0);
});
