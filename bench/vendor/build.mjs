// Vendors ESM bundles of CommonJS-only highlighters for the esdev
// bench harness (this runtime loads ES modules only).
// Run: node bench/vendor/build.mjs   (plain node — build-time only)
import { buildSync } from "esbuild";
import { readdirSync } from "node:fs";

const outdir = "bench/vendor";

// highlight.js — full build (192 languages); root import resolves to ESM.
buildSync({
  entryPoints: ["highlight.js"],
  bundle: true,
  format: "esm",
  outfile: `${outdir}/hljs.mjs`,
  logLevel: "warning",
});

// Prism — core plus every bundled language component, topologically ordered
// via components.json so `Prism.languages.extend` targets exist at import time.
import componentsJson from "prismjs/components.json" with { type: "json" };
const langIds = Object.keys(componentsJson.languages).filter((l) => l !== "meta");
const compFiles = new Set(
  readdirSync("node_modules/prismjs/components")
    .filter((f) => f.startsWith("prism-") && f.endsWith(".js") && !f.endsWith(".min.js"))
    .map((f) => f.slice("prism-".length, -".js".length)),
);
const withFiles = langIds.filter((l) => compFiles.has(l));
const ordered = [];
const done = new Set();
const visit = (l, stack = []) => {
  if (done.has(l)) return;
  if (stack.includes(l)) return;
  const req = componentsJson.languages[l]?.require;
  const deps = Array.isArray(req) ? req : req ? [req] : [];
  for (const d of deps) if (withFiles.includes(d)) visit(d, [...stack, l]);
  done.add(l);
  ordered.push(l);
};
withFiles.forEach((l) => visit(l));
const prismEntry = [
  `import { Prism } from "./prism-setup.js";`,
  ...ordered.map((l) => `import "prismjs/components/prism-${l}.js";`),
  `export { Prism };`,
  `export const prismLangs = ${JSON.stringify(ordered)};`,
].join("\n");
import { writeFileSync } from "node:fs";
writeFileSync(`${outdir}/prism-entry.js`, prismEntry);
buildSync({
  entryPoints: [`${outdir}/prism-entry.js`],
  bundle: true,
  format: "esm",
  outfile: `${outdir}/prism.mjs`,
  logLevel: "warning",
});

// lowlight (all grammars) + hast serializer.
buildSync({
  entryPoints: ["bench/vendor/lowlight-entry.js"],
  bundle: true,
  format: "esm",
  outfile: `${outdir}/lowlight.mjs`,
  logLevel: "warning",
});

console.log("vendor bundles built:", ["hljs.mjs", "prism.mjs", "lowlight.mjs"]);
