// Throughput harness — runs on the esdev runtime (`tsr bench`).
//
// Compares end-to-end source→HTML highlighting over website/public/samples:
//   - ours (UnifiedTokenizer + renderHTML)
//   - shiki (codeToHtml, TextMate grammars)
//   - sugar-high (highlight + span serialization; JS-family only)
//
// NOTE: highlight.js / Prism / lowlight ship CommonJS, which this runtime
// refuses to load — they run here as ESM bundles vendored by
// bench/vendor/build.mjs. starry-night is not reachable from this registry.
// Emits website/app/bench-data.js for the landing charts.
import { file, write } from "runtime:fs";
import { bundledLanguages, createHighlighter as createShiki } from "shiki";
import { highlight as sugarHighlight } from "sugar-high";
import {
  createHighlighter,
  type Highlighter,
  renderHTML,
} from "../packages/syntax-highlighter/src/index.ts";
import hljs from "./vendor/hljs.mjs";
import { lowlight, toHtml } from "./vendor/lowlight.mjs";
import { Prism } from "./vendor/prism.mjs";

const SAMPLES = "../website/public/samples";
const OUT = "../website/app/bench-data.js";
const WARMUP = 2;
const ITERS = 8;
const SUGAR_LANGS = new Set([
  "javascript",
  "typescript",
  "css",
  "python",
  "c",
  "go",
  "java",
  "rust",
  "json",
  "diff",
  "cpp",
  "csharp",
  "sql",
  "html",
  "yaml",
  "markdown",
  "ruby",
  "kotlin",
  "swift",
  "php",
  "toml",
  "powershell",
  "dockerfile",
  "graphql",
  "hcl",
  "zig",
  "lua",
]);
const SUGAR_MAP: Record<string, string> = { bash: "shell" };

// Ours-language -> competitor-language overrides; default is the same name.
const HLJS_MAP: Record<string, string> = {
  vb: "vbnet",
  pascal: "delphi",
  jinja: "django",
  gitconfig: "ini",
  env: "bash",
  batch: "dos",
  actions: "yaml",
  kubernetes: "yaml",
  html: "xml",
};
const PRISM_MAP: Record<string, string> = {
  html: "markup",
  xml: "markup",
  vb: "vbnet",
  jinja: "django",
  gitconfig: "git",
  rst: "rest",
  actions: "yaml",
  kubernetes: "yaml",
  env: "ini",
};
const LOWLIGHT_MAP: Record<string, string> = {
  ...HLJS_MAP,
};

const now = () =>
  typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
}

function sugarToHtml(code: string, lang: string): string {
  // sugar-high returns an HTML string directly.
  return sugarHighlight(code, { lang }) as unknown as string;
}

type CorpusFile = { lang: string; file: string; source: string; bytes: number };

async function loadCorpus(): Promise<CorpusFile[]> {
  const manifest = JSON.parse(await file(`${SAMPLES}/manifest.json`).text()) as Array<{
    language: string;
    file: string;
  }>;
  const out: CorpusFile[] = [];
  for (const e of manifest) {
    try {
      const source = await file(`${SAMPLES}/${e.file}`).text();
      if (!source) continue;
      out.push({ lang: e.language, file: e.file, source, bytes: source.length });
    } catch {
      // skip unreadable samples
    }
  }
  return out;
}

async function main() {
  const corpus = await loadCorpus();
  console.log(`corpus: ${corpus.length} files`);

  // ---- ours ----
  const oursCache = new Map<string, Highlighter>();
  const oursByFile = new Map<string, { ms: number; bytes: number; tokens: number }>();
  const perLang = new Map<string, number[]>();
  for (const f of corpus) {
    let h = oursCache.get(f.lang);
    if (!h) {
      h = await createHighlighter({ language: f.lang });
      oursCache.set(f.lang, h);
    }
    const run = () => {
      const toks = h.highlight(f.source);
      renderHTML(f.source, toks);
      return toks.length;
    };
    for (let i = 0; i < WARMUP; i++) run();
    const ts: number[] = [];
    let n = 0;
    for (let i = 0; i < ITERS; i++) {
      const t0 = now();
      n = run();
      ts.push(now() - t0);
    }
    const m = median(ts);
    oursByFile.set(f.file, { ms: m, bytes: f.bytes, tokens: n });
    if (!perLang.has(f.lang)) perLang.set(f.lang, []);
    perLang.get(f.lang)?.push(m);
  }

  // ---- shiki ----
  const shiki = await createShiki({
    themes: ["github-dark"],
    langs: Object.keys(bundledLanguages),
  });
  const shikiByFile = new Map<string, { ms: number; bytes: number }>();
  for (const f of corpus) {
    const run = () => shiki.codeToHtml(f.source, { lang: f.lang, theme: "github-dark" });
    try {
      run();
    } catch {
      continue; // language not bundled — skip, count coverage
    }
    for (let i = 0; i < WARMUP; i++) run();
    const ts: number[] = [];
    for (let i = 0; i < ITERS; i++) {
      const t0 = now();
      run();
      ts.push(now() - t0);
    }
    shikiByFile.set(f.file, { ms: median(ts), bytes: f.bytes });
  }
  try {
    (shiki as { dispose?: () => void }).dispose?.();
  } catch {
    // ignore
  }

  // ---- sugar-high (preset languages only) ----
  const sugarByFile = new Map<string, { ms: number; bytes: number }>();
  for (const f of corpus) {
    const lang = SUGAR_MAP[f.lang] ?? f.lang;
    if (!SUGAR_LANGS.has(lang)) continue;
    const run = () => sugarToHtml(f.source, lang);
    try {
      run();
    } catch {
      continue;
    }
    run();
    for (let i = 0; i < WARMUP; i++) run();
    const ts: number[] = [];
    for (let i = 0; i < ITERS; i++) {
      const t0 = now();
      run();
      ts.push(now() - t0);
    }
    sugarByFile.set(f.file, { ms: median(ts), bytes: f.bytes });
  }

  // ---- highlight.js (vendored ESM) ----
  const hljsByFile = new Map<string, { ms: number; bytes: number }>();
  for (const f of corpus) {
    const lang = HLJS_MAP[f.lang] ?? f.lang;
    let run: (() => string) | null = null;
    try {
      if (!hljs.getLanguage(lang)) continue;
      run = () => hljs.highlight(f.source, { language: lang }).value;
      run();
    } catch {
      continue;
    }
    for (let i = 0; i < WARMUP; i++) (run as () => string)();
    const ts: number[] = [];
    for (let i = 0; i < ITERS; i++) {
      const t0 = now();
      (run as () => string)();
      ts.push(now() - t0);
    }
    hljsByFile.set(f.file, { ms: median(ts), bytes: f.bytes });
  }

  // ---- Prism (vendored ESM) ----
  const prismByFile = new Map<string, { ms: number; bytes: number }>();
  for (const f of corpus) {
    const lang = PRISM_MAP[f.lang] ?? f.lang;
    const grammar = (Prism.languages as Record<string, unknown>)[lang];
    if (!grammar) continue;
    const run = () => Prism.highlight(f.source, grammar as never, lang);
    try {
      run();
    } catch {
      continue;
    }
    for (let i = 0; i < WARMUP; i++) run();
    const ts: number[] = [];
    for (let i = 0; i < ITERS; i++) {
      const t0 = now();
      run();
      ts.push(now() - t0);
    }
    prismByFile.set(f.file, { ms: median(ts), bytes: f.bytes });
  }

  // ---- lowlight (vendored ESM) ----
  const lowByFile = new Map<string, { ms: number; bytes: number }>();
  for (const f of corpus) {
    const lang = LOWLIGHT_MAP[f.lang] ?? f.lang;
    let run: (() => string) | null = null;
    try {
      if (!lowlight.listLanguages().includes(lang)) continue;
      run = () => toHtml(lowlight.highlight(lang, f.source));
      run();
    } catch {
      continue;
    }
    for (let i = 0; i < WARMUP; i++) (run as () => string)();
    const ts: number[] = [];
    for (let i = 0; i < ITERS; i++) {
      const t0 = now();
      (run as () => string)();
      ts.push(now() - t0);
    }
    lowByFile.set(f.file, { ms: median(ts), bytes: f.bytes });
  }

  // Headlines use identical file sets so bars are apples-to-apples.
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const subset = (a: Map<string, { ms: number; bytes: number }>, b: Map<string, unknown>) => {
    let ms = 0;
    let bytes = 0;
    let files = 0;
    for (const [file, v] of a) {
      if (!b.has(file)) continue;
      ms += v.ms;
      bytes += v.bytes;
      files++;
    }
    return { ms, bytes, files };
  };
  const vsShiki = subset(oursByFile, shikiByFile);
  const shikiOnCommon = subset(shikiByFile, oursByFile);
  const sugarOnCommon = subset(sugarByFile, oursByFile);
  const vsSugar = subset(oursByFile, sugarByFile);
  const hljsOnCommon = subset(hljsByFile, oursByFile);
  const vsHljs = subset(oursByFile, hljsByFile);
  const prismOnCommon = subset(prismByFile, oursByFile);
  const vsPrism = subset(oursByFile, prismByFile);
  const lowOnCommon = subset(lowByFile, oursByFile);
  const vsLow = subset(oursByFile, lowByFile);
  const mbs = (bytes: number, ms: number) => +(bytes / 1048576 / (ms / 1000)).toFixed(2);
  let commonTokens = 0;
  for (const [file, v] of oursByFile) {
    if (shikiByFile.has(file)) commonTokens += v.tokens;
  }
  const data = {
    generated: new Date().toISOString().slice(0, 10),
    corpus: { files: corpus.length, bytes: sum(corpus.map((f) => f.bytes)) },
    engines: {
      ours: {
        ms: +vsShiki.ms.toFixed(1),
        mbs: mbs(vsShiki.bytes, vsShiki.ms),
        ktps: Math.round(commonTokens / vsShiki.ms),
        files: vsShiki.files,
        note: "same files as Shiki",
      },
      shiki: {
        ms: +shikiOnCommon.ms.toFixed(1),
        mbs: mbs(shikiOnCommon.bytes, shikiOnCommon.ms),
        files: shikiOnCommon.files,
      },
      "sugar-high": {
        ms: +sugarOnCommon.ms.toFixed(1),
        mbs: mbs(sugarOnCommon.bytes, sugarOnCommon.ms),
        files: sugarOnCommon.files,
        note: "29 preset languages",
      },
      oursOnSugarSubset: {
        ms: +vsSugar.ms.toFixed(1),
        mbs: mbs(vsSugar.bytes, vsSugar.ms),
        files: vsSugar.files,
      },
      hljs: {
        ms: +hljsOnCommon.ms.toFixed(1),
        mbs: mbs(hljsOnCommon.bytes, hljsOnCommon.ms),
        files: hljsOnCommon.files,
      },
      oursOnHljsSubset: {
        ms: +vsHljs.ms.toFixed(1),
        mbs: mbs(vsHljs.bytes, vsHljs.ms),
        files: vsHljs.files,
      },
      prism: {
        ms: +prismOnCommon.ms.toFixed(1),
        mbs: mbs(prismOnCommon.bytes, prismOnCommon.ms),
        files: prismOnCommon.files,
      },
      oursOnPrismSubset: {
        ms: +vsPrism.ms.toFixed(1),
        mbs: mbs(vsPrism.bytes, vsPrism.ms),
        files: vsPrism.files,
      },
      lowlight: {
        ms: +lowOnCommon.ms.toFixed(1),
        mbs: mbs(lowOnCommon.bytes, lowOnCommon.ms),
        files: lowOnCommon.files,
      },
      oursOnLowSubset: {
        ms: +vsLow.ms.toFixed(1),
        mbs: mbs(vsLow.bytes, vsLow.ms),
        files: vsLow.files,
      },
    },
    speedupVsShiki: +(shikiOnCommon.ms / vsShiki.ms).toFixed(1),
    speedupVsSugar: +(sugarOnCommon.ms / vsSugar.ms).toFixed(1),
    speedupVsHljs: +(hljsOnCommon.ms / vsHljs.ms).toFixed(1),
    speedupVsPrism: +(prismOnCommon.ms / vsPrism.ms).toFixed(1),
    speedupVsLow: +(lowOnCommon.ms / vsLow.ms).toFixed(1),
    perLanguageMs: Object.fromEntries(
      [...perLang.entries()].map(([k, v]) => [k, +median(v).toFixed(2)]),
    ),
  };

  console.log(
    JSON.stringify({ engines: data.engines, speedupVsShiki: data.speedupVsShiki }, null, 1),
  );
  await write(
    OUT,
    `// Generated by \`tsr bench\` on ${data.generated} — do not edit by hand.\n` +
      `export const BENCH = ${JSON.stringify(data, null, 2)};\n`,
  );
  console.log(`wrote ${OUT}`);
}

await main();
