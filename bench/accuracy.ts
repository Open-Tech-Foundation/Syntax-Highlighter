// Accuracy harness — runs on the esdev runtime (`tsr bench:accuracy`).
//
// Scores our highlighting against Shiki's TextMate grammars (the grammars
// VS Code uses) character by character; see accuracy/score.ts for the color
// classes and mapping rules. Two corpora are reported separately:
//   - showcase:   website/public/samples (written for this project)
//   - real-world: bench/corpus/real-world (pinned third-party files)
//
//   esdev bench/accuracy.ts            report
//   esdev bench/accuracy.ts --update   report and rewrite the baseline
//   esdev bench/accuracy.ts --check    fail if any language regressed
//   esdev bench/accuracy.ts --explain=css
//                                      list every CSS mismatch with Shiki's
//                                      scope chain and our token type
import { file, write } from "runtime:fs";
import { dirname, fromFileURL, join } from "runtime:path";
import { args, exit } from "runtime:process";
import { type BundledLanguage, bundledLanguages, createHighlighter as createShiki } from "shiki";
import { createHighlighter, type Highlighter } from "../packages/syntax-highlighter/src/index.ts";
import {
  addScore,
  classesFromSpans,
  classesFromTokens,
  compare,
  emptyScore,
  percentages,
  type Score,
  type ShikiTokensResult,
  spansFromShiki,
} from "./accuracy/score.ts";

const ROOT = join(dirname(fromFileURL(import.meta.url)), "..");
const BASELINE = join(ROOT, "bench/accuracy-baseline.json");
const THEME = "github-dark";
/** Allowed drop (percentage points) before --check fails; absorbs float noise. */
const TOLERANCE = 0.1;

export const TIER1 = [
  "javascript",
  "typescript",
  "jsx",
  "python",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "bash",
  "yaml",
  "json",
  "css",
  "html",
  "markdown",
  "sql",
  "diff",
];

// Our language -> Shiki grammar when the names differ. Dialects without a
// dedicated grammar are scored against their base language.
const SHIKI_LANG: Record<string, string> = {
  objectivec: "objective-c",
  fortran: "fortran-free-form",
  env: "dotenv",
  assembly: "asm",
  gitconfig: "ini",
  actions: "yaml",
  kubernetes: "yaml",
};

type CorpusFile = { corpus: string; language: string; file: string; source: string };

async function loadCorpora(): Promise<CorpusFile[]> {
  const out: CorpusFile[] = [];
  const samples = join(ROOT, "website/public/samples");
  const manifest = (await file(join(samples, "manifest.json")).json()) as Array<{
    language: string;
    file: string;
  }>;
  for (const e of manifest) {
    const source = await file(join(samples, e.file)).text();
    out.push({ corpus: "showcase", language: e.language, file: e.file, source });
  }
  const realWorld = join(ROOT, "bench/corpus/real-world");
  const sources = (await file(join(realWorld, "sources.json")).json()) as Array<{
    language: string;
    file: string;
  }>;
  for (const e of sources) {
    const source = await file(join(realWorld, e.file)).text();
    out.push({ corpus: "real-world", language: e.language, file: e.file, source });
  }
  return out;
}

type LanguageResult = { chars: number; overall: number; highlighted: number };
type Baseline = {
  shiki: string;
  theme: string;
  corpora: Record<string, Record<string, LanguageResult>>;
};

function topConfusions(score: Score, n: number): string {
  return [...score.confusion.entries()]
    .sort((a, b) => b[1].chars - a[1].chars)
    .slice(0, n)
    .map(([key, v]) => `${key} ${v.chars} (${v.examples.map((e) => JSON.stringify(e)).join(", ")})`)
    .join("; ");
}

/** Print each mismatched reference span with its scopes and our token. */
function explainMismatches(
  f: CorpusFile,
  spans: ReturnType<typeof spansFromShiki>,
  tokens: ReturnType<Highlighter["highlight"]>,
  refClasses: string[],
  ourClasses: string[],
): void {
  console.log(`\n--- ${f.corpus}/${f.file}`);
  for (const span of spans) {
    const i = span.start;
    if (!span.text.trim() || refClasses[i] === ourClasses[i]) continue;
    const ours = tokens.find((t) => t.start <= i && i < t.end);
    const line = f.source.slice(0, i).split("\n").length;
    const inner = span.scopes.slice(-2).join(" > ");
    console.log(
      `${String(line).padStart(5)}  ${JSON.stringify(span.text).padEnd(28)} ${refClasses[i]}→${ourClasses[i]}  [${inner}]  ours=${ours?.type ?? "-"}`,
    );
  }
}

async function main() {
  const update = args.includes("--update");
  const check = args.includes("--check");
  const explain = args.find((a) => a.startsWith("--explain="))?.slice("--explain=".length);
  const files = await loadCorpora();

  const bundled = new Set(Object.keys(bundledLanguages));
  const shikiLangOf = (lang: string): BundledLanguage | null => {
    const name = SHIKI_LANG[lang] ?? lang;
    return bundled.has(name) ? (name as BundledLanguage) : null;
  };
  const needed = [...new Set(files.map((f) => shikiLangOf(f.language)).filter((l) => l !== null))];
  const shiki = await createShiki({ themes: [THEME], langs: needed });

  const ours = new Map<string, Highlighter>();
  const scores = new Map<string, Map<string, Score>>(); // corpus -> language -> score
  const skipped: string[] = [];

  for (const f of files) {
    const shikiLang = shikiLangOf(f.language);
    if (!shikiLang) {
      skipped.push(`${f.corpus}/${f.file} (no Shiki grammar for ${f.language})`);
      continue;
    }
    let h = ours.get(f.language);
    if (!h) {
      h = await createHighlighter({ language: f.language });
      ours.set(f.language, h);
    }
    const spans = spansFromShiki(
      shiki.codeToTokens(f.source, {
        lang: shikiLang,
        theme: THEME,
        includeExplanation: true,
      }) as ShikiTokensResult,
    );
    // Guard the offset bookkeeping: every span must line up with the source.
    const misaligned = spans.find(
      (s) => f.source.slice(s.start, s.start + s.text.length) !== s.text,
    );
    if (misaligned) {
      skipped.push(`${f.corpus}/${f.file} (reference offsets misaligned at ${misaligned.start})`);
      continue;
    }
    const tokens = h.highlight(f.source);
    const refClasses = classesFromSpans(f.source.length, spans);
    const ourClasses = classesFromTokens(f.source.length, tokens);
    const score = compare(f.source, refClasses, ourClasses);
    if (explain === f.language) explainMismatches(f, spans, tokens, refClasses, ourClasses);
    const byLang = scores.get(f.corpus) ?? new Map<string, Score>();
    byLang.set(f.language, addScore(byLang.get(f.language) ?? emptyScore(), score));
    scores.set(f.corpus, byLang);
  }

  const shikiVersion = (
    (await file(join(ROOT, "node_modules/shiki/package.json")).json()) as {
      version: string;
    }
  ).version;
  const result: Baseline = { shiki: shikiVersion, theme: THEME, corpora: {} };

  for (const [corpus, byLang] of scores) {
    result.corpora[corpus] = {};
    const tier1Total = emptyScore();
    const allTotal = emptyScore();
    console.log(`\n== ${corpus} ==`);
    console.log("   language        chars  overall  highlighted  top mismatches (reference→ours)");
    const langs = [...byLang.keys()].sort(
      (a, b) => Number(TIER1.includes(b)) - Number(TIER1.includes(a)) || a.localeCompare(b),
    );
    for (const lang of langs) {
      const score = byLang.get(lang) as Score;
      const pct = percentages(score);
      result.corpora[corpus][lang] = { chars: score.chars, ...pct };
      addScore(allTotal, score);
      if (TIER1.includes(lang)) addScore(tier1Total, score);
      console.log(
        `${TIER1.includes(lang) ? " * " : "   "}${lang.padEnd(14)} ${String(score.chars).padStart(6)}  ${pct.overall.toFixed(1).padStart(6)}%  ${pct.highlighted.toFixed(1).padStart(10)}%  ${topConfusions(score, 2)}`,
      );
    }
    const t = percentages(tier1Total);
    const a = percentages(allTotal);
    console.log(
      `   tier-1 total   ${String(tier1Total.chars).padStart(6)}  ${t.overall.toFixed(1).padStart(6)}%  ${t.highlighted.toFixed(1).padStart(10)}%`,
    );
    console.log(
      `   all languages  ${String(allTotal.chars).padStart(6)}  ${a.overall.toFixed(1).padStart(6)}%  ${a.highlighted.toFixed(1).padStart(10)}%`,
    );
  }
  console.log(
    "\n* tier-1. overall: all non-whitespace characters; highlighted: characters either side colors.",
  );
  if (skipped.length) console.log(`skipped:\n  ${skipped.join("\n  ")}`);

  if (check) {
    const baseline = (await file(BASELINE).json()) as Baseline;
    const regressions: string[] = [];
    for (const [corpus, langs] of Object.entries(baseline.corpora)) {
      for (const [lang, base] of Object.entries(langs)) {
        const now = result.corpora[corpus]?.[lang];
        if (!now) {
          regressions.push(`${corpus}/${lang}: no longer scored`);
          continue;
        }
        for (const metric of ["overall", "highlighted"] as const) {
          if (now[metric] < base[metric] - TOLERANCE) {
            regressions.push(`${corpus}/${lang} ${metric}: ${base[metric]}% → ${now[metric]}%`);
          }
        }
      }
    }
    if (regressions.length) {
      console.error(
        `\naccuracy regressed versus bench/accuracy-baseline.json:\n  ${regressions.join("\n  ")}`,
      );
      exit(1);
    }
    console.log("\naccuracy check passed: no language below its baseline");
  }

  if (update) {
    await write(BASELINE, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`\nwrote ${BASELINE}`);
  }
}

await main();
