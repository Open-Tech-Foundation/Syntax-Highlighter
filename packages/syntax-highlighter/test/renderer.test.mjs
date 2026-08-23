import { assert, assertEquals, test } from "runtime:test";
import { CSSHighlightRenderer, HIGHLIGHT_PREFIX } from "../src/core/css-renderer.ts";

class FakeHighlight {
  constructor(...ranges) {
    this.ranges = ranges;
  }
}

class FakeStaticRange {
  constructor(init) {
    Object.assign(this, init);
  }
}

const highlights = new Map();
globalThis.CSS = { highlights };
globalThis.Highlight = FakeHighlight;
globalThis.StaticRange = FakeStaticRange;
globalThis.document = {
  createTextNode(text) {
    return { textContent: text };
  },
};

function element() {
  return {
    textContent: "",
    appendChild(node) {
      this.child = node;
    },
  };
}

test("render(source,tokens) places source in element and registers sh-* highlights", () => {
  const el = element();
  const renderer = new CSSHighlightRenderer(el);
  const source = "const x = 42;";
  const tokens = [
    { type: "keyword", start: 0, end: 5 },
    { type: "variable", start: 6, end: 7 },
    { type: "number", start: 10, end: 12 },
  ];
  renderer.render(source, tokens);
  assertEquals(el.child.textContent, source);
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  assert(highlights.has(`${HIGHLIGHT_PREFIX}variable`));
  // check ranges use UTF-16 offsets
  const kwRanges = highlights.get(`${HIGHLIGHT_PREFIX}keyword`).ranges;
  assertEquals(kwRanges[0].startOffset, 0);
  assertEquals(kwRanges[0].endOffset, 5);
  assertEquals(source.slice(kwRanges[0].startOffset, kwRanges[0].endOffset), "const");
  renderer.dispose();
});

test("ranges use UTF-16 offsets and start inclusive end exclusive", () => {
  const el = element();
  const renderer = new CSSHighlightRenderer(el);
  const source = "const 𝒜 = 1;"; // 𝒜 is 2 code units at offset 6
  const tokens = [
    { type: "keyword", start: 0, end: 5 },
    { type: "variable", start: 6, end: 8 }, // surrogate pair
    { type: "number", start: 11, end: 12 },
  ];
  renderer.render(source, tokens);
  const varRanges = highlights.get(`${HIGHLIGHT_PREFIX}variable`).ranges;
  assertEquals(varRanges[0].startOffset, 6);
  assertEquals(varRanges[0].endOffset, 8);
  assertEquals(varRanges[0].endOffset - varRanges[0].startOffset, 2);
  assertEquals(source.slice(6, 8), "𝒜");
  // exclusive end: slice [6,8) recovers 𝒜
  renderer.dispose();
});

test("repeated render(source,tokens) removes stale highlights", () => {
  const el = element();
  const renderer = new CSSHighlightRenderer(el);
  renderer.render("let", [{ type: "keyword", start: 0, end: 3 }]);
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  renderer.render("x", [{ type: "variable", start: 0, end: 1 }]);
  assert(!highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  assert(highlights.has(`${HIGHLIGHT_PREFIX}variable`));
  assertEquals(el.child.textContent, "x");
  renderer.dispose();
});

test("renderers preserve external highlights and merge their own", () => {
  const external = new FakeHighlight("external");
  highlights.set("search", external);
  const first = new CSSHighlightRenderer(element());
  const second = new CSSHighlightRenderer(element());
  first.render("let", [{ type: "keyword", start: 0, end: 3 }]);
  second.render("x", [{ type: "variable", start: 0, end: 1 }]);
  assertEquals(highlights.get("search"), external);
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  assert(highlights.has(`${HIGHLIGHT_PREFIX}variable`));
  first.dispose();
  second.dispose();
  // external still preserved after dispose
  assertEquals(highlights.get("search"), external);
  highlights.delete("search");
});

test("render does not crash with empty token list", () => {
  const el = element();
  const renderer = new CSSHighlightRenderer(el);
  renderer.render("hello", []);
  assertEquals(el.child.textContent, "hello");
  // no highlights registered
  assert(!highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  renderer.dispose();
});

test("no setText() call is required", () => {
  const el = element();
  const renderer = new CSSHighlightRenderer(el);
  // Only render should be needed
  assert(typeof renderer.render === "function");
  // setText is private now — public API is render(source,tokens) only
  // Verify render works without ever calling setText
  renderer.render("const x = 1;", [{ type: "keyword", start: 0, end: 5 }]);
  assertEquals(el.child.textContent, "const x = 1;");
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  renderer.dispose();
});
