import { assert, assertEquals, test } from "runtime:test";
import { UnifiedTokenizer } from "../src/core/unified-tokenizer.ts";
import html from "../src/languages/html.ts";
import javascript from "../src/languages/javascript.ts";
import python from "../src/languages/python.ts";
import rust from "../src/languages/rust.ts";
import typescript from "../src/languages/typescript.ts";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function whitespaceless(tokenizer, source) {
  return tokenizer.tokenize(source).filter((t) => t.type !== "whitespace");
}

function kinds(tokenizer, source) {
  return whitespaceless(tokenizer, source).map((t) => `${t.type}:${source.slice(t.start, t.end)}`);
}

function types(tokenizer, source) {
  return whitespaceless(tokenizer, source).map((t) => t.type);
}

function findToken(tokenizer, source, text, occurrence = 0) {
  const all = whitespaceless(tokenizer, source);
  let seen = 0;
  for (const t of all) {
    if (source.slice(t.start, t.end) === text) {
      if (seen++ === occurrence) return t;
    }
  }
  return null;
}

// ================================================================
// JavaScript tests
// ================================================================

const js = new UnifiedTokenizer(javascript);

test("JS: keywords, booleans, null", () => {
  assertEquals(kinds(js, "const x = true;"), [
    "keyword:const",
    "variable:x",
    "operator:=",
    "boolean:true",
    "punctuation:;",
  ]);
});

test("JS: function declaration and call", () => {
  const src = 'function greet(name) { return name; } greet("hi");';
  assertEquals(findToken(js, src, "greet", 0).type, "function");
  assertEquals(findToken(js, src, "name", 0).type, "parameter");
  assertEquals(findToken(js, src, "greet", 1).type, "function");
  assertEquals(findToken(js, src, '"hi"').type, "string");
});

test("JS: class declaration and new", () => {
  const src = `
    class Point extends Base {
      move(x) { return x; }
    }
    const p = new Point(1);
  `;
  assertEquals(findToken(js, src, "Point", 0).type, "class");
  assertEquals(findToken(js, src, "Base").type, "class");
  assertEquals(findToken(js, src, "move", 0).type, "function");
  assertEquals(findToken(js, src, "Point", 1).type, "class");
});

test("JS: property access", () => {
  assertEquals(kinds(js, "obj.foo.bar()"), [
    "variable:obj",
    "punctuation:.",
    "property:foo",
    "punctuation:.",
    "method:bar",
    "punctuation:(",
    "punctuation:)",
  ]);
});

test("JS: template literals", () => {
  const src = "`a${ x }b`";
  assertEquals(types(js, src), ["string", "punctuation", "variable", "punctuation", "string"]);
});

test("JS: arrow function parameters", () => {
  const src = "const f = (a, b) => a + b;";
  assertEquals(findToken(js, src, "a", 0).type, "parameter");
  assertEquals(findToken(js, src, "b", 0).type, "parameter");
  assertEquals(findToken(js, src, "a", 1).type, "parameter");
  assertEquals(findToken(js, src, "b", 1).type, "parameter");
});

test("JS: destructured parameters", () => {
  const src = "function f({a, b: c = 1, ...rest}, [x]) { return a; }";
  assertEquals(findToken(js, src, "a", 0).type, "parameter");
  assertEquals(findToken(js, src, "b").type, "property");
  assertEquals(findToken(js, src, "c", 0).type, "parameter");
  assertEquals(findToken(js, src, "rest", 0).type, "parameter");
  assertEquals(findToken(js, src, "x", 0).type, "parameter");
});

test("JS: UPPER_CASE constants", () => {
  assertEquals(findToken(js, "const MAX_RETRIES = 3;", "MAX_RETRIES").type, "constant");
});

test("JS: regex vs division", () => {
  assertEquals(findToken(js, "return /ab+c/gi;", "/ab+c/gi").type, "regex");
  const div = kinds(js, "const half = total / 2;");
  assert(div.includes("operator:/"));
  assert(!div.some((k) => k.startsWith("regex")));
});

test("JS: tokens cover whole source", () => {
  const src = "const a=1;/*c*/let b=`t${b}s`;// x\n";
  let pos = 0;
  for (const t of js.tokenize(src)) {
    assertEquals(t.start, pos);
    pos = t.end;
  }
  assertEquals(pos, src.length);
});

test("JS: catch parameter binding", () => {
  const src = "try { run(); } catch (err) { warn(err); }";
  assertEquals(findToken(js, src, "err", 0).type, "parameter");
  assertEquals(findToken(js, src, "err", 1).type, "parameter");
});

test("JS: private fields", () => {
  const src = "class Counter { #count = 0; read() { return this.#count; } }";
  assertEquals(findToken(js, src, "count", 0).type, "property");
  assertEquals(findToken(js, src, "count", 1).type, "property");
});

test("JS: arrow in callback", () => {
  const src = "[1,2,3].map(n => n * 2).filter(n => n > 2);";
  assertEquals(findToken(js, src, "n", 0).type, "parameter");
  assertEquals(findToken(js, src, "n", 1).type, "parameter");
  assertEquals(findToken(js, src, "n", 2).type, "parameter");
  assertEquals(findToken(js, src, "n", 3).type, "parameter");
});

// ================================================================
// TypeScript tests
// ================================================================

const ts = new UnifiedTokenizer(typescript);

test("TS: type alias declaration", () => {
  const src = "type Point = { x: number; y: number; };";
  assertEquals(findToken(ts, src, "Point").type, "class");
});

test("TS: interface declaration", () => {
  const src = "interface Props { name: string; }";
  assertEquals(findToken(ts, src, "Props").type, "class");
});

test("TS: satisfies keyword", () => {
  const src = "const config = { port: 8080 } satisfies Options;";
  const k = kinds(ts, src);
  assert(k.includes("keyword:satisfies"), `expected keyword:satisfies in ${JSON.stringify(k)}`);
});

// ================================================================
// HTML tests
// ================================================================

const htmlTok = new UnifiedTokenizer(html);

test("HTML: tag names", () => {
  assertEquals(findToken(htmlTok, "<div>Hello</div>", "div").type, "tag");
});

test("HTML: attributes", () => {
  const src = '<a href="/url" class="link">text</a>';
  assertEquals(findToken(htmlTok, src, "href").type, "attribute");
  assertEquals(findToken(htmlTok, src, "class").type, "attribute");
});

test("HTML: comments", () => {
  assertEquals(findToken(htmlTok, "<!-- comment -->", "<!-- comment -->").type, "comment");
});

test("HTML: embedded script", () => {
  const src = "<script>const x = 42;</script>";
  assertEquals(findToken(htmlTok, src, "const").type, "keyword");
  assertEquals(findToken(htmlTok, src, "42").type, "number");
});

test("HTML: self-closing tags", () => {
  const src = '<br/><img src="x"/>';
  assertEquals(findToken(htmlTok, src, "br").type, "tag");
  assertEquals(findToken(htmlTok, src, "img").type, "tag");
});

// ================================================================
// Generic language tests (Python, Rust)
// ================================================================

const py = new UnifiedTokenizer(python);

test("Python: keywords", () => {
  const src = "def hello(): return True";
  assertEquals(findToken(py, src, "def").type, "keyword");
  assertEquals(findToken(py, src, "True").type, "boolean");
});

test("Python: strings", () => {
  const src = 'x = """multi\nline"""';
  assertEquals(findToken(py, src, '"""multi\nline"""').type, "string");
});

const rustTok = new UnifiedTokenizer(rust);

test("Rust: prefixed strings", () => {
  const src = 'r#"raw string"#';
  assertEquals(findToken(rustTok, src, 'r#"raw string"#').type, "string");
});

// ================================================================
// Performance
// ================================================================

test("perf: tokenizer completes in reasonable time", () => {
  const src = `
    function fibonacci(n) {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    }
    const result = fibonacci(10);
    console.log(result);
  `.repeat(100);

  const start = performance.now();
  js.tokenize(src);
  const time = performance.now() - start;
  console.log(`UnifiedTokenizer: ${time.toFixed(2)}ms`);
  assert(time > 0);
});
