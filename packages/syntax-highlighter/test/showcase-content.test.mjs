/**
 * Content the demo ships must stay consistent with the library: every demo
 * sample listed in the manifest exists, names a registered language, and
 * tokenizes within the contract.
 *
 * Tests run from the workspace root, so `demo/` is readable.
 */

import { exists, file } from "runtime:fs";
import { dirname, fromFileURL, join } from "runtime:path";
import { assert, assertEquals, test } from "runtime:test";
import { createHighlighter, getRegisteredLanguages, validateTokens } from "../src/index.ts";

const repoRoot = join(dirname(fromFileURL(import.meta.url)), "..", "..", "..");
const samplesDir = join(repoRoot, "demo/public/samples");

test("demo manifest entries are unique, exist, and tokenize within the contract", async () => {
  const manifest = await file(join(samplesDir, "manifest.json")).json();
  const languages = new Set(getRegisteredLanguages());
  assert(manifest.length > 0, "manifest is empty");
  assertEquals(new Set(manifest.map((e) => e.name)).size, manifest.length, "duplicate names");

  for (const entry of manifest) {
    assert(languages.has(entry.language), `${entry.name}: unknown language ${entry.language}`);
    const path = join(samplesDir, entry.file);
    assert(await exists(path), `${entry.name}: missing sample file ${entry.file}`);
    const source = await file(path).text();
    const highlighter = await createHighlighter({ language: entry.language });
    validateTokens(source, highlighter.highlight(source));
  }
});

test("demo offers a CSS sample", async () => {
  const manifest = await file(join(samplesDir, "manifest.json")).json();
  assert(
    manifest.some((e) => e.language === "css"),
    "the CSS sample is missing from the manifest",
  );
});
