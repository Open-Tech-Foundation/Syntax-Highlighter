import { assert, assertEquals, test } from "runtime:test";
import {
  getRegisteredLanguages,
  loadLanguage,
  registerLanguage,
  resolveBuiltinName,
} from "../src/core/registry.ts";

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

test("shell fence names used by docs sites resolve to bash", async () => {
  for (const alias of ["console", "shellscript", "shell-session"]) {
    assertEquals((await loadLanguage(alias)).name, "bash");
  }
});

test("every alias a built-in definition declares resolves before it loads", async () => {
  // A definition's own aliases register only once it has loaded, so each must
  // also be in the static alias table — `rb` and `org-mode` once were not.
  const missing = [];
  for (const name of getRegisteredLanguages()) {
    const builtin = resolveBuiltinName(name);
    if (!builtin) continue; // a custom language registered by another test
    const definition = await loadLanguage(builtin);
    for (const alias of definition.aliases ?? []) {
      if (resolveBuiltinName(alias) !== builtin) missing.push(`${alias} → ${builtin}`);
    }
  }
  assertEquals(missing, []);
});

test("rb and org-mode resolve to ruby and org", async () => {
  assertEquals(resolveBuiltinName("rb"), "ruby");
  assertEquals(resolveBuiltinName("org-mode"), "org");
  assertEquals((await loadLanguage("RB")).name, "ruby");
});
