import { assert, assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { HtmlRenderer } from "../src/core/html-renderer.ts";
import javascript from "../src/languages/javascript.ts";

const highlighter = new Highlighter(javascript);

function render(src) {
  return new HtmlRenderer().render(src, highlighter.highlight(src));
}

test("HtmlRenderer.render wraps semantic tokens with sh- prefix", () => {
  const src = "const x = 42;";
  const html = render(src);
  assert(html.includes('<span class="sh-keyword">const</span>'));
  assert(html.includes('<span class="sh-variable">x</span>'));
  assert(html.includes('<span class="sh-number">42</span>'));
  assert(!html.includes('<span class="sh-whitespace"'));
});

test("HtmlRenderer escapes HTML entities", () => {
  const src = "const s = \"<div> & 'x'\";";
  const html = render(src);
  assert(html.includes("&lt;div&gt;"));
  assert(html.includes("&amp;"));
  assert(!html.includes("<div>"));
  assert(html.includes("&quot;") || html.includes("&#39;"));
});

test("HtmlRenderer recovers text via source.slice", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const html = new HtmlRenderer().render(src, toks);
  const text = html
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
  assertEquals(text, src);
});

test("HtmlRenderer handles surrogate pairs", () => {
  const src = "const 𝒜 = 1;";
  const html = render(src);
  assert(html.includes("𝒜"));
  const toks = highlighter.highlight(src);
  const html2 = new HtmlRenderer().render(src, toks);
  assertEquals(
    html2
      .replaceAll(/<[^>]+>/g, "")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&"),
    src,
  );
});

test("HtmlRenderer fills gaps for non-contiguous tokens", () => {
  const src = "const x = 42;";
  const partial = [{ start: 0, end: 5, type: "keyword" }];
  const html = new HtmlRenderer().render(src, partial);
  assert(html.includes('<span class="sh-keyword">const</span>'));
  assert(html.includes("x = 42;"));
});

test("HtmlRenderer custom prefix and wrapWhitespace", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const html = new HtmlRenderer({ prefix: "tok-" }).render(src, toks);
  assert(html.includes('<span class="tok-keyword">'));
  const html2 = new HtmlRenderer({ wrapWhitespace: true }).render(src, toks);
  assert(html2.includes('<span class="sh-whitespace">'));
});

test("HtmlRenderer.renderDocument wraps in pre code", () => {
  const src = "const x = 42;";
  const doc = new HtmlRenderer().renderDocument(src, highlighter.highlight(src));
  assert(doc.startsWith("<pre"));
  assert(doc.includes("<code>"));
  assert(doc.includes("</code></pre>"));
  assert(doc.includes('<span class="sh-keyword">const</span>'));
});

test("HtmlRenderer class is canonical", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const r = new HtmlRenderer();
  assertEquals(r.render(src, toks), new HtmlRenderer().render(src, toks));
});

test("empty source renders empty string", () => {
  assertEquals(new HtmlRenderer().render("", []), "");
  assertEquals(new HtmlRenderer().renderDocument("", []), "<pre><code></code></pre>");
});

test("tokens are renderer-agnostic: no DOM Range used", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  for (const t of toks) {
    assertEquals(Object.keys(t).sort(), ["end", "start", "type"]);
    assert(!("text" in t));
  }
  const html = new HtmlRenderer().render(src, toks);
  assert(html.length > 0);
});
