import { assert, assertEquals, test } from "runtime:test";
import { highlightAll, highlightCode, languageOf } from "../src/index.ts";

// ---- Minimal DOM: enough for highlightAll and CSSHighlightRenderer ----

/** Set-like, as the real `Highlight` is. */
class FakeHighlight {
  #set = new Set();
  add(range) {
    this.#set.add(range);
    return this;
  }
  delete(range) {
    return this.#set.delete(range);
  }
  get size() {
    return this.#set.size;
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
globalThis.document = { createTextNode: (text) => ({ textContent: text }) };

function el(tag, cls, text = "", parent = null) {
  return {
    tagName: tag,
    parentElement: parent,
    innerHTML: undefined,
    textContent: text,
    getAttribute: (name) => (name === "class" ? cls : null),
    appendChild(node) {
      this.textContent = node.textContent;
    },
  };
}

/** A root whose querySelectorAll returns `elements` and records the selector. */
function rootOf(...elements) {
  return {
    selector: null,
    querySelectorAll(selector) {
      this.selector = selector;
      return elements;
    },
  };
}

const keywordRanges = () => highlights.get("sh-keyword")?.size ?? 0;

// ---- languageOf ----

test("languageOf reads language-* or lang-* from the element or an ancestor", () => {
  assertEquals(languageOf(el("code", "language-JS")), "js");
  assertEquals(languageOf(el("code", "foo lang-py bar")), "py");
  assertEquals(languageOf(el("code", "", "", el("pre", "line-numbers language-c++"))), "c++");
  assertEquals(languageOf(el("code", "hljs")), null);
  assertEquals(languageOf(el("code", null)), null);
});

// ---- highlightAll ----

test("mode is required and validated", async () => {
  for (const options of [undefined, {}, { mode: "auto" }, { mode: "HTML" }]) {
    let error = null;
    try {
      await highlightAll(options);
    } catch (e) {
      error = e;
    }
    assert(error instanceof TypeError, `expected TypeError for ${JSON.stringify(options)}`);
  }
});

test("html mode writes escaped spans; skips missing and unknown languages", async () => {
  const js = el("code", "language-js", "if (a < b) x();");
  const none = el("code", "", "plain");
  const unknown = el("code", "language-nope", "<x>");
  const result = await highlightAll({ mode: "html", root: rootOf(js, none, unknown) });
  assertEquals(result.highlighted, [js]);
  assertEquals(
    result.skipped.map((s) => [s.element, s.language, s.reason]),
    [
      [none, null, "no-language"],
      [unknown, "nope", "unknown-language"],
    ],
  );
  assert(js.innerHTML.includes('<span class="sh-control">if</span>'), js.innerHTML);
  assert(js.innerHTML.includes("&lt;"), "source text is escaped");
  assertEquals(none.innerHTML, undefined, "skipped blocks are not touched");
  assertEquals(unknown.innerHTML, undefined);
});

test("defaultLanguage applies to blocks that declare none", async () => {
  const block = el("code", "", "let x;");
  const result = await highlightAll({ mode: "html", root: rootOf(block), defaultLanguage: "js" });
  assertEquals(result.highlighted, [block]);
  assert(block.innerHTML.includes("sh-keyword"));
});

test("selector and prefix options are honored", async () => {
  const block = el("code", "language-js", "let x;");
  const root = rootOf(block);
  await highlightAll({ mode: "html", root, selector: "code.hl", prefix: "x-" });
  assertEquals(root.selector, "code.hl");
  assert(block.innerHTML.includes('class="x-keyword"'), block.innerHTML);
});

test("the default selector matches Prism's", async () => {
  const root = rootOf();
  await highlightAll({ mode: "html", root });
  assertEquals(
    root.selector,
    'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code',
  );
});

test("highlight mode registers ranges, re-runs replace them, dispose releases", async () => {
  const a = el("code", "language-js", "let a;");
  const b = el("code", "language-ts", "const b = 1;");
  const root = rootOf(a, b);
  const first = await highlightAll({ mode: "highlight", root });
  assertEquals(first.highlighted, [a, b]);
  assertEquals(keywordRanges(), 2);
  assertEquals(a.innerHTML, undefined, "highlight mode leaves the markup alone");

  const second = await highlightAll({ mode: "highlight", root });
  assertEquals(keywordRanges(), 2, "re-highlighting replaces, not stacks");
  second.dispose();
  assertEquals(keywordRanges(), 0);
  first.dispose(); // disposing an already-released result is harmless
  assertEquals(keywordRanges(), 0);
});

test("switching a block from highlight to html mode releases its ranges", async () => {
  const block = el("code", "language-js", "let a;");
  const root = rootOf(block);
  await highlightAll({ mode: "highlight", root });
  assertEquals(keywordRanges(), 1);
  await highlightAll({ mode: "html", root });
  assertEquals(keywordRanges(), 0);
  assert(block.innerHTML.includes("sh-keyword"));
});

test("language aliases resolve (ts, sh, console, yml)", async () => {
  const blocks = ["ts", "sh", "console", "yml"].map((l) => el("code", `language-${l}`, "x"));
  const result = await highlightAll({ mode: "html", root: rootOf(...blocks) });
  assertEquals(result.highlighted.length, 4);
  assertEquals(result.skipped, []);
});

// ---- highlightCode ----

test("highlightCode returns spans and the canonical language", async () => {
  const { html, language } = await highlightCode("const x = 1;", { language: "js" });
  assertEquals(language, "javascript");
  assert(html.startsWith('<span class="sh-keyword">const</span>'), html);
});

test("highlightCode falls back to escaped text for missing or unknown languages", async () => {
  for (const options of [undefined, {}, { language: "" }, { language: "nope" }]) {
    assertEquals(await highlightCode('<b> & "q"', options), {
      html: "&lt;b&gt; &amp; &quot;q&quot;",
      language: null,
    });
  }
});

test("highlightCode honors the prefix and rejects non-strings", async () => {
  const { html } = await highlightCode("let x;", { language: "js", prefix: "hl-" });
  assert(html.includes('class="hl-keyword"'));
  let error = null;
  try {
    await highlightCode(42, { language: "js" });
  } catch (e) {
    error = e;
  }
  assert(error instanceof TypeError);
});
