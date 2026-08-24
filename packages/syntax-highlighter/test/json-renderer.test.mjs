import { assertEquals, assertThrows, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { renderJSON, validateTokens } from "../src/core/json-renderer.ts";
import javascript from "../src/languages/javascript.ts";

const highlighter = new Highlighter(javascript);

function tokens(source) {
  return highlighter.highlight(source);
}

test("renderJSON preserves token JSON output", () => {
  const src = "const x = 42;";
  const toks = tokens(src);
  const json = renderJSON(src, toks);
  const parsed = JSON.parse(json);
  assertEquals(parsed, toks);
  for (const t of parsed) {
    assertEquals(Object.keys(t).sort(), ["end", "start", "type"]);
    assertEquals(src.slice(t.start, t.end).length, t.end - t.start);
  }
});

test("validateTokens accepts contiguous coverage and rejects gaps", () => {
  const src = "const x = 42;";
  const toks = tokens(src);
  validateTokens(src, toks);
  const gapped = toks.slice(1);
  assertThrows(() => validateTokens(src, gapped));
});

test("renderJSON validates and rejects overlapping tokens", () => {
  const src = "const x = 42;";
  const dup = [...tokens(src)];
  dup.splice(1, 0, dup[1]);
  assertThrows(() => renderJSON(src, dup));
});

test("renderJSON rejects visual type leak", () => {
  const src = "const x = 42;";
  const toks = tokens(src);
  const bad = toks.map((t) => ({ ...t }));
  bad[0] = { start: 0, end: 5, type: "blue-keyword" };
  assertThrows(() => renderJSON(src, bad));
});

test("renderJSON rejects text/value/modifiers fields", () => {
  const src = "const x = 42;";
  const bad = [{ start: 0, end: 5, type: "keyword", text: "const" }];
  assertThrows(() => renderJSON(src, bad));
});

test("renderJSON rejects split surrogate pair", () => {
  const src = "const 𝒜 = 1;";
  const bad = [
    { start: 0, end: 5, type: "keyword" },
    { start: 5, end: 6, type: "whitespace" },
    { start: 6, end: 7, type: "variable" },
    { start: 7, end: 8, type: "variable" },
    { start: 8, end: 9, type: "whitespace" },
    { start: 9, end: 10, type: "operator" },
    { start: 10, end: 11, type: "whitespace" },
    { start: 11, end: 12, type: "number" },
    { start: 12, end: 13, type: "punctuation" },
  ];
  assertThrows(() => renderJSON(src, bad));
});

test("renderJSON rejects unsorted tokens", () => {
  const src = "const x = 42;";
  const toks = [...tokens(src)].reverse();
  assertThrows(() => renderJSON(src, toks));
});

test("renderJSON rejects out-of-bounds end", () => {
  const src = "hi";
  assertThrows(() => renderJSON(src, [{ start: 0, end: 99, type: "variable" }]));
});

test("empty source renders empty array", () => {
  assertEquals(renderJSON("", []), "[]");
});

test("whitespace-only source validates", () => {
  const src = "   ";
  const toks = tokens(src);
  assertEquals(JSON.parse(renderJSON(src, toks)), toks);
});
