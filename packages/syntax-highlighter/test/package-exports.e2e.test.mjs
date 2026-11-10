/**
 * End-to-end: every documented import path resolves through package.json
 * "exports" to a built JavaScript module and a declaration file.
 *
 * The README's `@opentf/syntax-highlighter/ansi/themes/dracula` once mapped
 * to a non-existent `src/ansi/themes/dracula` (no extension) and failed with
 * ERR_MODULE_NOT_FOUND. This builds the library into a temporary directory
 * — so it cannot race the browser e2e build in `dist/` — and resolves each
 * subpath the way Node and TypeScript do.
 */

import { exists, file, makeTempDir, mkdir, remove } from "runtime:fs";
import { dirname, fromFileURL, join } from "runtime:path";
import { Command } from "runtime:system";
import { afterAll, assert, assertEquals, beforeAll, test } from "runtime:test";

const packageRoot = join(dirname(fromFileURL(import.meta.url)), "..");
let tempRoot;
let outDir;
let exportsMap;

beforeAll(async () => {
  // Same git-ignored scratch root as the browser e2e. esdev creates --out
  // itself, so it must not exist yet: build into a child of the temp dir.
  const scratch = "node_modules/.tmp";
  await mkdir(scratch, { recursive: true });
  tempRoot = await makeTempDir({ dir: scratch, prefix: "sh-exports-" });
  outDir = join(tempRoot, "dist");
  // esdev rejects an absolute --out ("cannot move … into place"), so pass it
  // relative to the package root the build runs in.
  const relativeOut = outDir.slice(packageRoot.length + 1);
  const build = await new Command("esdev", {
    args: ["build", "--lib", "src", `--out=${relativeOut}`],
    cwd: packageRoot,
    inheritEnv: true,
  }).output();
  if (!build.success) {
    throw new Error(`esdev build failed:\n${new TextDecoder().decode(build.stderr)}`);
  }
  exportsMap = (await file(join(packageRoot, "package.json")).json()).exports;
});

afterAll(async () => {
  if (tempRoot) await remove(tempRoot, { recursive: true });
});

/** Resolve `subpath` (e.g. "./ansi/themes/dracula") for one condition. */
function resolve(subpath, condition) {
  let target = exportsMap[subpath];
  let star = null;
  if (target === undefined) {
    for (const key of Object.keys(exportsMap)) {
      if (!key.endsWith("*")) continue;
      const prefix = key.slice(0, -1);
      if (subpath.startsWith(prefix)) {
        target = exportsMap[key];
        star = subpath.slice(prefix.length);
        break;
      }
    }
  }
  assert(target !== undefined, `no "exports" entry matches ${subpath}`);
  if (typeof target === "object") target = target[condition] ?? target.default;
  if (star !== null) target = target.replaceAll("*", star);
  // Point built paths at this test's private build.
  return target.startsWith("./dist/")
    ? join(outDir, target.slice("./dist/".length))
    : join(packageRoot, target);
}

const MODULES = [
  [".", (m) => typeof m.createHighlighter === "function"],
  ["./ansi/themes", (m) => typeof m.ANSI_THEMES === "object"],
  ["./ansi/themes/dracula", (m) => m.dracula?.keyword === "#ff79c6" && m.default === m.dracula],
  ["./ansi/themes/default-light", (m) => typeof m.defaultLight === "object"],
  ["./ansi/themes/tokyo-night", (m) => typeof m.default === "object"],
];

for (const [subpath, check] of MODULES) {
  test(`${subpath} resolves to a working module with types`, async () => {
    const js = resolve(subpath, "default");
    assert(await exists(js), `${subpath} → ${js} does not exist`);
    const mod = await import(new URL(`file://${js}`).href);
    assert(check(mod), `${subpath} did not export the expected values`);

    const types = resolve(subpath, "types");
    assert(types.endsWith(".d.ts"), `${subpath} types → ${types}`);
    assert(await exists(types), `${subpath} types → ${types} does not exist`);
  });
}

test("CSS themes resolve to shipped stylesheets", async () => {
  const css = resolve("./themes/default.css", "default");
  assert(await exists(css), `${css} does not exist`);
  assert((await file(css).text()).includes("::highlight("));
});

test("raw TypeScript sources are no longer published for ANSI themes", async () => {
  const pkg = await file(join(packageRoot, "package.json")).json();
  assertEquals(
    pkg.files.filter((f) => f.startsWith("src/ansi")),
    [],
  );
});
