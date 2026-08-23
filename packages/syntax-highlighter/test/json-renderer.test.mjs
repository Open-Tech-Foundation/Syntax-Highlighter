import { assert, assertEquals, assertThrows, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { JsonRenderer, validateTokens } from "../src/core/json-renderer.ts";
import javascript from "../src/languages/javascript.ts";

const highlighter = new Highlighter(javascript);

function tokens(source) {
  return highlighter.highlight(source);
}

test("JsonRenderer.render preserves token JSON output", () => {
  const src = "const x = 42;";
  const toks = tokens(src);
  const json = new JsonRenderer().render(src, toks);
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

test("JsonRenderer validates and rejects overlapping tokens", () => {
  const src = "const x = 42;";
  const dup = [...tokens(src)];
  dup.splice(1, 0, dup[1]);
  assertThrows(() => new JsonRenderer().render(src, dup));
});

test("JsonRenderer rejects visual type leak", () => {
  const src = "const x = 42;";
  const toks = tokens(src);
  const bad = toks.map((t) => ({ ...t }));
  bad[0] = { start: 0, end: 5, type: "blue-keyword" };
  assertThrows(() => new JsonRenderer().render(src, bad));
});

test("JsonRenderer rejects text/value/modifiers fields", () => {
  const src = "const x = 42;";
  const bad = [{ start: 0, end: 5, type: "keyword", text: "const" }];
  assertThrows(() => new JsonRenderer().render(src, bad));
});

test("JsonRenderer rejects split surrogate pair", () => {
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
  assertThrows(() => new JsonRenderer().render(src, bad));
});

test("JsonRenderer rejects unsorted tokens", () => {
  const src = "const x = 42;";
  const toks = [...tokens(src)].reverse();
  assertThrows(() => new JsonRenderer().render(src, toks));
});

test("JsonRenderer rejects out-of-bounds end", () => {
  const src = "hi";
  assertThrows(() => new JsonRenderer().render(src, [{ start: 0, end: 99, type: "variable" }]));
});

test("JsonRenderer class API is canonical", () => {
  const src = "const x = 42;";
  const toks = tokens(src);
  const r = new JsonRenderer();
  r.validate(src, toks);
  assertEquals(JSON.parse(r.render(src, toks)), toks);
});

test("empty source validates", () => {
  assertEquals(new JsonRenderer().render("", []), "[]");
});

test("whitespace-only source validates", () => {
  const src = "   ";
  const toks = tokens(src);
  assertEquals(JSON.parse(new JsonRenderer().render(src, toks)), toks);
});
