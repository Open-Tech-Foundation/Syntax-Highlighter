import { assert, assertEquals, test } from "runtime:test";
import { LEDE, LINKS, SAMPLES, editHint } from "./page.ts";

test("the hint names the file it is pointing at", () => {
  assertEquals(editHint("src/main.ts"), "Edit src/main.ts and save.");
});

test("every link is absolute", () => {
  // They are rendered into a page that may be served from any path, so a
  // relative one would resolve against wherever the visitor happens to be.
  for (const link of LINKS) {
    assert(link.href.startsWith("https://"), link.href);
  }
});

test("the page says what it is for", () => {
  assert(LEDE.includes("Playground"), LEDE);
});

test("every sample has a name and non-empty source", () => {
  for (const sample of SAMPLES) {
    assert(sample.name.length > 0, sample.name);
    assert(sample.source.includes("\n"), sample.name);
  }
});
