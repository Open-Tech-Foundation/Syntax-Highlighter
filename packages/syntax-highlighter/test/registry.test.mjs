import { assert, assertEquals, test } from "runtime:test";
import { getRegisteredLanguages, loadLanguage, registerLanguage } from "../src/core/registry.ts";

function throws(fn) {
  try {
    fn();
  } catch {
    return true;
  }
  return false;
}

async function rejects(fn) {
  try {
    await fn();
  } catch {
    return true;
  }
  return false;
}

test("language registration validates runtime input", () => {
  assert(throws(() => registerLanguage(null)));
  assert(throws(() => registerLanguage({ name: "bad", keywords: [1] })));
  assert(
    throws(() =>
      registerLanguage({
        name: "bad-strings",
        lex: { strings: [{ open: "", close: "'" }] },
      }),
    ),
  );
});

test("language aliases load the registered definition", async () => {
  const definition = registerLanguage({
    name: "test-language",
    aliases: ["tl"],
    keywords: ["frob"],
  });
  assertEquals(await loadLanguage("TL"), definition);
  assert(getRegisteredLanguages().includes("test-language"));
});

test("re-registering a language removes stale aliases", async () => {
  registerLanguage({ name: "replaceable", aliases: ["old-name"] });
  const replacement = registerLanguage({ name: "REPLACEABLE", aliases: ["new-name"] });
  assertEquals(await loadLanguage("new-name"), replacement);
  assert(await rejects(() => loadLanguage("old-name")));
});

test("an alias cannot take over another language's name", () => {
  registerLanguage({ name: "occupied", keywords: ["a"] });
  assert(throws(() => registerLanguage({ name: "squatter", aliases: ["occupied"] })));
  // A built-in counts even before it has been lazily imported.
  assert(throws(() => registerLanguage({ name: "squatter", aliases: ["JavaScript"] })));
  // The rejected definition must not have half-registered itself.
  assert(!getRegisteredLanguages().includes("squatter"));
});

test("built-in languages are listed before they are loaded", () => {
  assert(getRegisteredLanguages().includes("javascript"));
});
