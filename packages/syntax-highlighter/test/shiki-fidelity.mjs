import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import cssLang from "shiki/langs/css.mjs";
import htmlLang from "shiki/langs/html.mjs";
import jsLang from "shiki/langs/javascript.mjs";
import jsonLang from "shiki/langs/json.mjs";
import tsLang from "shiki/langs/typescript.mjs";
import theme from "shiki/themes/github-dark.mjs";

import { UnifiedTokenizer } from "../dist/index.js";
import htmlDef from "../dist/languages/html.js";
import jsDef from "../dist/languages/javascript.js";
import jsonDef from "../dist/languages/json.js";
import tsDef from "../dist/languages/typescript.js";

const shiki = createHighlighterCoreSync({
  themes: [theme],
  langs: [jsLang, tsLang, htmlLang, cssLang, jsonLang],
  engine: createJavaScriptRegexEngine(),
});

const UNIFIED_MAP = {
  javascript: new UnifiedTokenizer(jsDef),
  typescript: new UnifiedTokenizer(tsDef),
  html: new UnifiedTokenizer(htmlDef),
  json: new UnifiedTokenizer(jsonDef),
};

function shikiTokens(src, lang, hl = shiki) {
  const result = hl.codeToTokens(src, {
    lang,
    theme: "github-dark",
    includeExplanation: true,
  });
  const out = [];
  for (const line of result.tokens) {
    for (const tok of line) {
      const scopes = [];
      if (tok.explanation) {
        for (const exp of tok.explanation) {
          for (const s of exp.scopes) {
            scopes.push(s.scopeName);
          }
        }
      }
      out.push({ content: tok.content, offset: tok.offset, scopes });
    }
  }
  return out;
}

function unifiedTokens(src, lang, umap = UNIFIED_MAP) {
  const tok = umap[lang];
  const result = tok.tokenize(src);
  return result
    .filter((t) => t.type !== "whitespace")
    .map((t) => ({ type: t.type, start: t.start, end: t.end, value: src.slice(t.start, t.end) }));
}

const SHIKI_SCOPE_TO_SEMANTIC = {
  "keyword.control.js": "keyword",
  "keyword.control.conditional.js": "keyword",
  "keyword.control.loop.js": "keyword",
  "keyword.control.trycatch.js": "keyword",
  "keyword.control.import.js": "keyword",
  "keyword.operator.new.js": "keyword",
  "keyword.operator.expression.typeof.js": "keyword",
  "keyword.operator.expression.instanceof.js": "keyword",
  "keyword.operator.expression.in.js": "keyword",
  "keyword.operator.expression.of.js": "keyword",
  "keyword.operator.void.js": "keyword",
  "keyword.operator.delete.js": "keyword",
  "keyword.operator.debugger.js": "keyword",
  "storage.type.js": "keyword",
  "storage.modifier.js": "keyword",
  "storage.type.function.js": "keyword",
  "storage.type.class.js": "keyword",
  "storage.type.interface.js": "keyword",
  "storage.type.enum.js": "keyword",
  "storage.type.type.js": "keyword",
  "storage.type.namespace.js": "keyword",
  "entity.name.type.js": "class",
  "entity.name.class.js": "class",
  "entity.name.type.class.js": "class",
  "entity.name.type.interface.js": "class",
  "entity.name.type.enum.js": "class",
  "entity.name.type.alias.js": "class",
  "entity.name.type.namespace.js": "class",
  "entity.name.function.js": "function",
  "entity.name.tag.js": "tag",
  "entity.other.attribute-name.js": "attribute",
  "variable.other.constant.js": "constant",
  "variable.other.constant.readonly.js": "constant",
  "variable.other.readwrite.js": "variable",
  "variable.parameter.js": "parameter",
  "variable.language.this.js": "variable",
  "variable.language.super.js": "variable",
  "variable.language.arguments.js": "variable",
  "constant.language.js": "constant",
  "constant.numeric.decimal.js": "number",
  "constant.numeric.hex.js": "number",
  "constant.numeric.octal.js": "number",
  "constant.numeric.binary.js": "number",
  "string.quoted.single.js": "string",
  "string.quoted.double.js": "string",
  "string.template.js": "string",
  "string.regexp.js": "string",
  "punctuation.definition.string.begin.js": "string",
  "punctuation.definition.string.end.js": "string",
  "punctuation.definition.comment.js": "comment",
  "comment.line.double-slash.js": "comment",
  "comment.block.js": "comment",
  "keyword.operator.js": "operator",
  "keyword.operator.arithmetic.js": "operator",
  "keyword.operator.comparison.js": "operator",
  "keyword.operator.logical.js": "operator",
  "keyword.operator.assignment.js": "operator",
  "keyword.operator.ternary.js": "operator",
  "punctuation.terminator.statement.js": "punctuation",
  "punctuation.definition.block.begin.js": "punctuation",
  "punctuation.definition.block.end.js": "punctuation",
  "punctuation.definition.parameters.begin.js": "punctuation",
  "punctuation.definition.parameters.end.js": "punctuation",
  "punctuation.separator.comma.js": "punctuation",
  "punctuation.separator.period.js": "punctuation",
  "punctuation.accessor.js": "punctuation",
  "punctuation.definition.typeparameters.begin.js": "punctuation",
  "punctuation.definition.typeparameters.end.js": "punctuation",
  "punctuation.definition.typeparameters.js": "punctuation",

  // HTML scopes
  "entity.name.tag.html": "tag",
  "entity.other.attribute-name.html": "attribute",
  "string.quoted.double.html": "string",
  "string.quoted.single.html": "string",
  "comment.block.html": "comment",
  "punctuation.definition.tag.begin.html": "punctuation",
  "punctuation.definition.tag.end.html": "punctuation",

  // TS-specific
  "keyword.control.ts": "keyword",
  "storage.type.ts": "keyword",
  "entity.name.type.ts": "class",
  "entity.name.function.ts": "function",
  "variable.other.constant.ts": "constant",
  "variable.parameter.ts": "parameter",
  "constant.numeric.decimal.ts": "number",
  "string.quoted.single.ts": "string",
  "string.quoted.double.ts": "string",
  "string.template.ts": "string",
  "comment.line.double-slash.ts": "comment",
  "comment.block.ts": "comment",
  "keyword.operator.ts": "operator",
  "punctuation.terminator.statement.ts": "punctuation",
  "punctuation.definition.block.begin.ts": "punctuation",
  "punctuation.definition.block.end.ts": "punctuation",
  "variable.language.this.ts": "variable",
  "variable.language.super.ts": "variable",

  // JSON scopes
  "support.type.property-name.json": "key",
  "punctuation.support.type.property-name.begin.json": "key",
  "punctuation.support.type.property-name.end.json": "key",
  "string.quoted.double.json": "string",
  "punctuation.definition.string.begin.json": "string",
  "punctuation.definition.string.end.json": "string",
  "constant.numeric.json": "number",
  "constant.language.json": "boolean",
  "punctuation.definition.dictionary.begin.json": "punctuation",
  "punctuation.definition.dictionary.end.json": "punctuation",
  "punctuation.definition.array.begin.json": "punctuation",
  "punctuation.definition.array.end.json": "punctuation",
  "punctuation.separator.dictionary.pair.json": "punctuation",
  "punctuation.separator.array.json": "punctuation",
  "meta.structure.dictionary.json": "other",
  "meta.structure.dictionary.value.json": "other",
  "meta.structure.array.json": "other",
};

function mapShikiToSemantic(scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const mapped = SHIKI_SCOPE_TO_SEMANTIC[scopes[i]];
    if (mapped) return mapped;
  }
  return genericShikiToSemantic(scopes);
}

/**
 * Language-agnostic fallback: TextMate grammars share a common scope vocabulary
 * (`entity.name.function`, `constant.numeric`, `keyword.control`, …) across all
 * languages. Map the most-specific scope in the chain to our semantic token type
 * so the fidelity harness works for any grammar Shiki ships, not just the
 * hand-written JS/TS/HTML/JSON entries above.
 */
function genericShikiToSemantic(scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const s = scopes[i].toLowerCase();
    if (s.includes("comment")) return "comment";
    if (s.includes("string") || s.includes("regexp") || s.includes("template")) return "string";
    if (s.includes("constant.numeric")) return "number";
    if (s.includes("constant.language")) {
      if (/null|nil|none|undefined/.test(s)) return "null";
      if (/true|false/.test(s)) return "boolean";
      return "constant";
    }
    if (s.includes("constant")) return "constant";
    if (s.includes("variable.parameter")) return "parameter";
    if (
      s.includes("entity.name.function") ||
      s.includes("entity.name.method") ||
      /\.function$/.test(s) ||
      /\.method$/.test(s)
    )
      return "function";
    if (
      s.includes("entity.name.class") ||
      s.includes("entity.name.type") ||
      s.includes("entity.name.struct") ||
      s.includes("entity.name.namespace") ||
      s.includes("support.type")
    )
      return "class";
    if (s.includes("entity.name.tag")) return "tag";
    if (s.includes("entity.other.attribute-name")) return "attribute";
    if (s.includes("keyword.control")) return "control";
    if (s.includes("keyword")) return "keyword";
    if (s.includes("storage")) return "keyword";
    if (s.includes("variable")) return "variable";
    if (s.includes("operator")) return "operator";
    if (s.includes("punctuation")) return "punctuation";
  }
  return "other";
}

function buildSpans(tokens) {
  const spans = [];
  let pos = 0;
  for (const tok of tokens) {
    if (tok.offset > pos) {
      spans.push({ start: pos, end: tok.offset, type: "whitespace" });
    }
    const end = tok.offset + tok.content.length;
    const semantic = mapShikiToSemantic(tok.scopes);
    spans.push({ start: tok.offset, end, type: semantic, content: tok.content });
    pos = end;
  }
  return spans;
}

function buildUnifiedSpans(src, lang, umap = UNIFIED_MAP) {
  const tokens = unifiedTokens(src, lang, umap);
  return tokens.map((t) => ({ start: t.start, end: t.end, type: t.type, value: t.value }));
}

function compareSpans(src, shikiSpans, unifiedSpans) {
  const results = { match: 0, mismatch: 0, details: [] };

  // Build a lookup for unified spans by start position (skip whitespace)
  const unifiedByStart = new Map();
  for (const s of unifiedSpans) {
    unifiedByStart.set(s.start, s);
  }

  // For each non-whitespace Shiki span, only compare if boundaries match exactly
  for (const shiki of shikiSpans) {
    if (shiki.type === "whitespace") continue;

    const unified = unifiedByStart.get(shiki.start);
    if (!unified) continue;

    // Only compare if boundaries match (exact or Shiki is subset of unified)
    const boundariesMatch = unified.start === shiki.start && unified.end >= shiki.end;
    if (!boundariesMatch) continue; // different granularity — skip

    if (shiki.type === unified.type) {
      results.match++;
    } else if (shiki.type === "other" || unified.type === "other") {
      results.match++;
    } else {
      const equiv = isSemanticEquiv(shiki.type, unified.type);
      if (equiv) {
        results.match++;
      } else {
        results.mismatch++;
        results.details.push({
          pos: shiki.start,
          shiki: shiki.type,
          unified: unified.type,
          src: src.slice(shiki.start, shiki.end),
        });
      }
    }
  }

  return results;
}

function isSemanticEquiv(a, b) {
  const groups = [
    ["keyword", "storage"],
    ["variable", "constant", "parameter"],
    ["class", "type"],
    ["function", "method"],
    ["number"],
    ["string", "regex"],
    ["boolean", "null"],
    ["comment"],
    ["operator"],
    ["punctuation", "tag", "attribute"],
  ];
  for (const g of groups) {
    if (g.includes(a) && g.includes(b)) return true;
  }
  return false;
}

// ======================================================================
// Test samples
// ======================================================================

const JS_SAMPLES = [
  { name: "const declaration", src: "const x = 42;" },
  { name: "function declaration", src: "function add(a, b) { return a + b; }" },
  { name: "arrow function", src: "const mul = (a, b) => a * b;" },
  { name: "class declaration", src: "class Foo extends Bar { constructor() { super(); } }" },
  { name: "if/else", src: "if (x > 0) { console.log(x); } else { console.log(0); }" },
  { name: "for loop", src: "for (let i = 0; i < 10; i++) { arr[i] = i * 2; }" },
  { name: "template literal", src: "const msg = `hello ${name}`;" },
  { name: "destructuring", src: "const { a, b: c } = obj;" },
  { name: "array destructuring", src: "const [first, ...rest] = arr;" },
  { name: "import/export", src: 'import { foo } from "bar"; export default foo;' },
  { name: "async/await", src: "async function fetch() { const data = await resp.json(); }" },
  { name: "null/boolean literals", src: "const a = null; const b = true; const c = false;" },
  { name: "ternary", src: "const x = val > 0 ? val : -val;" },
  { name: "spread operator", src: "const merged = { ...a, ...b };" },
  { name: "optional chaining", src: "const v = obj?.prop?.method();" },
  { name: "arrow in callback", src: "[1,2,3].map(n => n * 2).filter(n => n > 2);" },
  {
    name: "nested function",
    src: "function outer() { function inner() { return 1; } return inner(); }",
  },
  { name: "string concatenation", src: '"hello" + " " + "world"' },
  { name: "regex literal", src: "const match = str.match(/^[a-z]+$/);" },
  { name: "switch statement", src: "switch (x) { case 1: break; default: break; }" },
  { name: "try/catch", src: "try { foo(); } catch (e) { console.error(e); }" },
  { name: "for-of loop", src: "for (const item of items) { process(item); }" },
  { name: "for-in loop", src: "for (const key in obj) { console.log(key); }" },
  { name: "new expression", src: "const d = new Date();" },
  { name: "computed property", src: "const o = { [key]: value };" },
  { name: "method shorthand", src: "const obj = { method() { return this; } };" },
  {
    name: "getter/setter",
    src: "const obj = { get x() { return 1; }, set x(v) { this._x = v; } };",
  },
  { name: "number formats", src: "const a = 0xFF; const b = 1_000; const c = 3.14;" },
  {
    name: "label statement",
    src: "outer: for (let i = 0; i < 10; i++) { inner: for (let j = 0; j < 10; j++) { if (i === j) break outer; } }",
  },
];

const TS_SAMPLES = [
  { name: "type annotation", src: "const x: number = 42;" },
  { name: "interface", src: "interface Props { name: string; age: number; }" },
  { name: "type alias", src: "type ID = string | number;" },
  { name: "enum", src: "enum Color { Red, Green, Blue }" },
  { name: "generics", src: "function identity<T>(arg: T): T { return arg; }" },
  { name: "union type", src: "function process(x: string | number): void {}" },
  { name: "tuple type", src: "const pair: [string, number] = ['a', 1];" },
  { name: "type assertion", src: "const el = document.getElementById('app') as HTMLElement;" },
  { name: "non-null assertion", src: "const len = str!.length;" },
  { name: "mapped type", src: "type Readonly<T> = { readonly [K in keyof T]: T[K]; };" },
  { name: "conditional type", src: "type IsString<T> = T extends string ? true : false;" },
  {
    name: "namespace",
    src: "namespace Util { export function pad(s: string): string { return s; } }",
  },
  {
    name: "access modifiers",
    src: "class Foo { private _x: number; protected y: string; public z: boolean; }",
  },
  {
    name: "readonly modifier",
    src: "interface Config { readonly apiUrl: string; readonly timeout: number; }",
  },
  { name: "satisfies operator", src: 'const config = { apiUrl: "x" } satisfies Config;' },
];

const HTML_SAMPLES = [
  { name: "basic element", src: '<div class="app"><p>Hello</p></div>' },
  { name: "self-closing tag", src: '<img src="photo.jpg" alt="photo" />' },
  { name: "script tag", src: "<script>const x = 42;</script>" },
  { name: "style tag", src: "<style>.app { color: red; }</style>" },
  { name: "comment", src: "<!-- this is a comment -->" },
  { name: "attribute without value", src: '<input type="checkbox" disabled />' },
  { name: "template expression", src: "<div>${variable}</div>" },
  { name: "nested elements", src: '<div><span><a href="#">link</a></span></div>' },
];

const JSON_SAMPLES = [
  { name: "simple object", src: '{"name": "John", "age": 30}' },
  { name: "nested object", src: '{"user": {"name": "John", "address": {"city": "NYC"}}}' },
  { name: "array of strings", src: '{"tags": ["admin", "user"]}' },
  { name: "boolean and null", src: '{"active": true, "deleted": false, "data": null}' },
  { name: "number formats", src: '{"int": 42, "float": 3.14, "neg": -1}' },
  { name: "empty structures", src: '{"empty_obj": {}, "empty_arr": []}' },
  { name: "deeply nested", src: '{"a": {"b": {"c": {"d": "deep"}}}}' },
  { name: "mixed array", src: '{"data": [1, "two", true, null, {"key": "val"}]}' },
];

// ======================================================================
// Run comparison
// ======================================================================

function runComparison(name, samples, shikiLang, unifiedLang, hl = shiki, umap = UNIFIED_MAP) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"=".repeat(60)}`);

  let totalMatch = 0;
  let totalMismatch = 0;
  let totalTokens = 0;
  const allMismatches = [];

  for (const sample of samples) {
    const shikiRaw = shikiTokens(sample.src, shikiLang, hl);
    const shikiSpans = buildSpans(shikiRaw);
    const unifiedSpans = buildUnifiedSpans(sample.src, unifiedLang, umap);
    const cmp = compareSpans(sample.src, shikiSpans, unifiedSpans);

    totalMatch += cmp.match;
    totalMismatch += cmp.mismatch;
    totalTokens += unifiedSpans.length;

    if (cmp.mismatch > 0) {
      allMismatches.push({ sample: sample.name, src: sample.src, details: cmp.details });
    }

    const pct =
      cmp.match + cmp.mismatch > 0
        ? ((cmp.match / (cmp.match + cmp.mismatch)) * 100).toFixed(1)
        : "N/A";
    const status = cmp.mismatch === 0 ? "✓" : "✗";
    console.log(
      `  ${status} ${sample.name.padEnd(30)} ${pct}% match (${cmp.match}/${cmp.match + cmp.mismatch})`,
    );
  }

  const total = totalMatch + totalMismatch;
  const pct = total > 0 ? ((totalMatch / total) * 100).toFixed(1) : "N/A";
  console.log(
    `\n  Total: ${totalMatch}/${total} tokens match (${pct}%) | ${totalTokens} unified tokens | ${totalMismatch} mismatches`,
  );

  if (allMismatches.length > 0) {
    console.log(`\n  Detailed mismatches:`);
    for (const m of allMismatches) {
      console.log(`\n    [${m.sample}] "${m.src}"`);
      for (const d of m.details) {
        console.log(`      pos ${d.pos}: shiki="${d.shiki}" unified="${d.unified}" src="${d.src}"`);
      }
    }
  }

  return { totalMatch, totalMismatch, totalTokens };
}

const jsResults = runComparison("JavaScript", JS_SAMPLES, "javascript", "javascript");
const tsResults = runComparison("TypeScript", TS_SAMPLES, "typescript", "typescript");
const htmlResults = runComparison("HTML", HTML_SAMPLES, "html", "html");
const jsonResults = runComparison("JSON", JSON_SAMPLES, "json", "json");

// ======================================================================
// Extended languages (TextMate grammars shipped by Shiki)
// ======================================================================

const EXT_LANGS = [
  {
    key: "python",
    shiki: "python",
    samples: [
      {
        name: "class + method",
        src: "class Dog:\n    def bark(self):\n        return 42  # bark\n",
      },
      { name: "control flow", src: "if x > 0:\n    for i in range(10):\n        print(i)\n" },
      { name: "literals", src: 'name = "Bob"\nage = 30\ndone = True\n' },
    ],
  },
  {
    key: "java",
    shiki: "java",
    samples: [
      {
        name: "class + method",
        src: "class App {\n  int run() {\n    return 1; // note\n  }\n}\n",
      },
      { name: "control flow", src: "if (x > 0) { for (int i = 0; i < 10; i++) {} }\n" },
      { name: "literals", src: 'String s = "hi"; int n = 3; boolean b = false;\n' },
    ],
  },
  {
    key: "rust",
    shiki: "rust",
    samples: [
      { name: "fn + struct", src: "fn main() {\n  let x = 1; // c\n}\nstruct Foo { y: i32 }\n" },
      { name: "control flow", src: "if x > 0 { for i in 0..10 {} } else {}\n" },
      { name: "literals", src: 'let s = "hi"; let n = 3; let b = true;\n' },
    ],
  },
  {
    key: "go",
    shiki: "go",
    samples: [
      { name: "func", src: "func add(a int) int {\n  return a // c\n}\n" },
      { name: "control flow", src: "if x > 0 { for i := 0; i < 10; i++ {} }\n" },
      { name: "literals", src: 's := "hi"\nn := 3\nb := true\n' },
    ],
  },
  {
    key: "ruby",
    shiki: "ruby",
    samples: [
      { name: "class + method", src: 'class Dog\n  def bark\n    puts "hi" # c\n  end\nend\n' },
      { name: "control flow", src: "if x > 0\n  for i in 0..10\n    puts i\n  end\nend\n" },
      { name: "literals", src: 'name = "Bob"\nn = 3\ndone = true\n' },
    ],
  },
  {
    key: "c",
    shiki: "c",
    samples: [
      { name: "function", src: "int add(int a) {\n  return a; /* c */\n}\n" },
      { name: "control flow", src: "if (x > 0) { for (int i=0;i<10;i++) {} }\n" },
      { name: "literals", src: 'char* s = "hi"; int n = 3; const int M = 5;\n' },
    ],
  },
  {
    key: "cpp",
    shiki: "cpp",
    samples: [
      { name: "class", src: "class App {\npublic:\n  void run() {}\n};\n" },
      { name: "control flow", src: "if (x > 0) { while (i < 10) { i++; } }\n" },
      { name: "literals", src: 'std::string s = "hi"; int n = 3; bool b = false;\n' },
    ],
  },
  {
    key: "csharp",
    shiki: "csharp",
    samples: [
      { name: "class + method", src: "class App {\n  void Run() { /* c */ }\n}\n" },
      { name: "control flow", src: "if (x > 0) { for (int i = 0; i < 10; i++) {} }\n" },
      { name: "literals", src: 'string s = "hi"; int n = 3; bool b = false;\n' },
    ],
  },
  {
    key: "kotlin",
    shiki: "kotlin",
    samples: [
      { name: "class + fun", src: "class App {\n  fun run() { /* c */ }\n}\n" },
      { name: "control flow", src: "if (x > 0) { for (i in 0..10) {} }\n" },
      { name: "literals", src: 'val s = "hi"\nval n = 3\nval b = true\n' },
    ],
  },
  {
    key: "swift",
    shiki: "swift",
    samples: [
      { name: "class + func", src: "class App {\n  func run() { /* c */ }\n}\n" },
      { name: "control flow", src: "if x > 0 { for i in 0..<10 {} }\n" },
      { name: "literals", src: 'let s = "hi"\nlet n = 3\nlet b = true\n' },
    ],
  },
  {
    key: "scala",
    shiki: "scala",
    samples: [
      { name: "class + def", src: "class App {\n  def run(): Unit = { /* c */ }\n}\n" },
      { name: "control flow", src: "if (x > 0) { for (i <- 0 until 10) {} }\n" },
      { name: "literals", src: 'val s = "hi"\nval n = 3\nval b = true\n' },
    ],
  },
  {
    key: "php",
    shiki: "php",
    samples: [
      { name: "class + function", src: "<?php\nclass App {\n  function run() { /* c */ }\n}\n" },
      { name: "control flow", src: "<?php\nif ($x > 0) { for ($i=0;$i<10;$i++) {} }\n" },
      { name: "literals", src: '<?php\n$s = "hi"; $n = 3; $b = true;\n' },
    ],
  },
  {
    key: "dart",
    shiki: "dart",
    samples: [
      { name: "class + void", src: "class App {\n  void run() { /* c */ }\n}\n" },
      { name: "control flow", src: "if (x > 0) { for (var i = 0; i < 10; i++) {} }\n" },
      { name: "literals", src: 'var s = "hi"; var n = 3; var b = true;\n' },
    ],
  },
  {
    key: "lua",
    shiki: "lua",
    samples: [
      { name: "function", src: "function add(a)\n  return a -- c\nend\n" },
      { name: "control flow", src: "if x > 0 then\n  for i=1,10 do\n    print(i)\n  end\nend\n" },
      { name: "literals", src: 's = "hi"\nn = 3\nb = true\n' },
    ],
  },
  {
    key: "bash",
    shiki: "bash",
    samples: [
      { name: "if/echo", src: 'if true; then\n  echo "hi" # c\nfi\n' },
      { name: "for loop", src: 'for i in 1 2 3; do\n  echo "$i"\ndone\n' },
      { name: "variables", src: 'name="Bob"\ncount=3\n' },
    ],
  },
  {
    key: "haskell",
    shiki: "haskell",
    samples: [
      { name: "function", src: "add :: Int -> Int\nadd x = x + 1 -- c\n" },
      { name: "literals", src: 'name = "Bob"\nn = 3\nb = True\n' },
    ],
  },
  {
    key: "sql",
    shiki: "sql",
    samples: [
      { name: "select", src: "SELECT name FROM users WHERE id = 1; -- c\n" },
      { name: "keywords", src: "INSERT INTO t (a, b) VALUES (1, 2);\n" },
      { name: "literals", src: "SELECT 'hi', 3, true;\n" },
    ],
  },
  {
    key: "yaml",
    shiki: "yaml",
    samples: [
      { name: "mapping", src: "name: John\nage: 30 # c\n" },
      { name: "list", src: "- item1\n- item2\n" },
      { name: "literals", src: "flag: true\ncount: 3\ntext: hello\n" },
    ],
  },
  {
    key: "elixir",
    shiki: "elixir",
    samples: [
      { name: "module + def", src: "defmodule M do\n  def run, do: :ok # c\nend\n" },
      { name: "control flow", src: "if x > 0 do\n  for i <- 1..10, do: IO.puts(i)\nend\n" },
      { name: "literals", src: 's = "hi"\nn = 3\nb = true\n' },
    ],
  },
  {
    key: "r",
    shiki: "r",
    samples: [
      { name: "function", src: "add <- function(a) {\n  return(a) # c\n}\n" },
      { name: "control flow", src: "if (x > 0) { for (i in 1:10) { print(i) } }\n" },
      { name: "literals", src: 's <- "hi"\nn <- 3\nb <- TRUE\n' },
    ],
  },
  {
    key: "perl",
    shiki: "perl",
    samples: [
      { name: "sub", src: "sub add {\n  return 1; # c\n}\n" },
      { name: "control flow", src: "if ($x > 0) { for (my $i=0;$i<10;$i++) {} }\n" },
      { name: "literals", src: '$s = "hi"; $n = 3; $b = 1;\n' },
    ],
  },
  {
    key: "zig",
    shiki: "zig",
    samples: [
      { name: "fn", src: "fn add(a: i32) i32 {\n  return a; // c\n}\n" },
      { name: "control flow", src: "if (x > 0) { while (i < 10) : (i += 1) {} }\n" },
      { name: "literals", src: 'const s = "hi"; const n = 3; const b = true;\n' },
    ],
  },
];

const extGrammarModules = await Promise.all(
  EXT_LANGS.map((l) => import(`shiki/langs/${l.shiki}.mjs`)),
);

const shikiExt = createHighlighterCoreSync({
  themes: [theme],
  langs: extGrammarModules.map((m) => m.default),
  engine: createJavaScriptRegexEngine(),
});

const extUnified = {};
for (let i = 0; i < EXT_LANGS.length; i++) {
  const def = (await import(`../dist/languages/${EXT_LANGS[i].key}.js`)).default;
  extUnified[EXT_LANGS[i].key] = new UnifiedTokenizer(def);
}

const extResults = EXT_LANGS.map((l) =>
  runComparison(l.key, l.samples, l.shiki, l.key, shikiExt, extUnified),
);

console.log(`\n${"=".repeat(60)}`);
console.log(`  OVERALL SUMMARY`);
console.log(`${"=".repeat(60)}`);
const rows = [
  ["JS", jsResults],
  ["TS", tsResults],
  ["HTML", htmlResults],
  ["JSON", jsonResults],
  ...EXT_LANGS.map((l, i) => [l.key, extResults[i]]),
];
let grandMatch = 0;
let grandMismatch = 0;
for (const [label, r] of rows) {
  const tot = r.totalMatch + r.totalMismatch;
  const pct = tot > 0 ? ((r.totalMatch / tot) * 100).toFixed(1) : "N/A";
  console.log(`  ${label.padEnd(10)} ${r.totalMatch}/${tot} (${pct}%)`);
  grandMatch += r.totalMatch;
  grandMismatch += r.totalMismatch;
}
const grandTotal = grandMatch + grandMismatch;
const grandPct = grandTotal > 0 ? ((grandMatch / grandTotal) * 100).toFixed(1) : "N/A";
console.log(`  ────────────────────────────`);
console.log(`  Grand Total: ${grandMatch}/${grandTotal} (${grandPct}%)`);
console.log(`\n  ${rows.length} languages compared against Shiki TextMate grammars.`);

shiki.dispose();
shikiExt.dispose();
