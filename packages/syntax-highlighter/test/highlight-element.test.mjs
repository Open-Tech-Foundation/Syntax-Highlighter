import { assert, assertEquals, test } from "runtime:test";
import { HIGHLIGHT_PREFIX } from "../src/core/renderer.ts";
import { highlightElement } from "../src/index.ts";

class FakeHighlight {
  constructor(...ranges) {
    this.ranges = ranges;
  }
}

const highlights = new Map();
globalThis.CSS = { highlights };
globalThis.Highlight = FakeHighlight;
globalThis.StaticRange = class {
  constructor(init) {
    Object.assign(this, init);
  }
};
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

test("highlightElement paints the source through the named highlights", async () => {
  const handle = await highlightElement(element(), "const x = 1;");
  assert(highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
  assert(highlights.has(`${HIGHLIGHT_PREFIX}number`));
  handle.dispose();
  assert(!highlights.has(`${HIGHLIGHT_PREFIX}keyword`));
});

test("debounceMs: 0 refreshes synchronously", async () => {
  const node = element();
  const handle = await highlightElement(node, "const x = 1;", { debounceMs: 0 });
  handle.refresh('const x = "s";');
  assertEquals(node.child.textContent, 'const x = "s";');
  assert(highlights.has(`${HIGHLIGHT_PREFIX}string`));
  handle.dispose();
});

test("a debounced refresh coalesces and stops at dispose", async () => {
  const node = element();
  const handle = await highlightElement(node, "const x = 1;", { debounceMs: 5 });
  handle.refresh("const a = 1;");
  handle.refresh("const b = 2;");
  // Still the original text until the timer fires.
  assertEquals(node.child.textContent, "const x = 1;");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assertEquals(node.child.textContent, "const b = 2;");

  handle.refresh("const c = 3;");
  handle.dispose();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assertEquals(node.child.textContent, "const b = 2;", "disposal cancels the pending paint");
});
