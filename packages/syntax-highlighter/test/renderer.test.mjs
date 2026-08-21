import { assert, assertEquals, test } from "runtime:test";
import {
  HIGHLIGHT_PREFIX,
  HighlightRenderer,
} from "../src/core/renderer.ts";

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

test("renderers preserve external highlights and merge their own ranges", () => {
  const external = new FakeHighlight("external");
  highlights.set("search", external);

  const first = new HighlightRenderer(element());
  const second = new HighlightRenderer(element());
  first.setText("let");
  second.setText("x");
  first.render([{ type: "keyword", start: 0, end: 3 }]);
  second.render([{ type: "variable", start: 0, end: 1 }]);

  assertEquals(highlights.get("search"), external);
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  assert(highlights.has(`${HIGHLIGHT_PREFIX}variable`));
  first.dispose();
  second.dispose();
});

test("setText removes stale owned ranges without clearing external entries", () => {
  const external = new FakeHighlight("external");
  highlights.set("search", external);
  const renderer = new HighlightRenderer(element());
  renderer.setText("let");
  renderer.render([{ type: "keyword", start: 0, end: 3 }]);
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  renderer.setText("x");
  assert(!highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  assertEquals(highlights.get("search"), external);
  renderer.dispose();
});
