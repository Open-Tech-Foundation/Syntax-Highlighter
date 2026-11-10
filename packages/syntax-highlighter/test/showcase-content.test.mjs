/**
 * Content the demo and website ship must stay consistent with the library:
 * every demo sample listed in the manifest exists, names a registered
 * language, and tokenizes within the contract; every docs link on the
 * homepage points at a real docs page.
 *
 * Tests run from the workspace root, so `demo/` and `website/` are readable.
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

test("homepage docs links resolve to existing docs pages", async () => {
  const page = await file(join(repoRoot, "website/app/page.jsx")).text();
  const hrefs = [...page.matchAll(/href="(\/docs[^"#?]*)"/g)].map((m) => m[1]);
  assert(hrefs.length > 0, "no /docs links found on the homepage");
  for (const href of hrefs) {
    const route = href.replace(/^\/docs\/?/, "");
    const mdx = join(repoRoot, "website/app/docs", route, "page.mdx");
    assert(await exists(mdx), `${href} has no page at ${mdx}`);
  }
});

test("quickstart call-to-action buttons point at the quickstart page", async () => {
  const page = await file(join(repoRoot, "website/app/page.jsx")).text();
  const quickstartCta = /<a class="button" href="([^"]+)">\s*Read the quickstart/.exec(page);
  assert(quickstartCta, "the 'Read the quickstart' button is missing");
  assertEquals(quickstartCta[1], "/docs/quick-start");
});
