/**
 * UnifiedTokenizer Correctness Tests
 *
 * Comprehensive tests covering all token types, edge cases, and language-specific
 * features. Tests against ACTUAL tokenizer behavior.
 */

import { assert, assertEquals, test } from "runtime:test";
import { UnifiedTokenizer } from "../src/core/unified-tokenizer.ts";
import bashLang from "../src/languages/bash.ts";
import cLang from "../src/languages/c.ts";
import cpp from "../src/languages/cpp.ts";
import css from "../src/languages/css.ts";
import go from "../src/languages/go.ts";
import html from "../src/languages/html.ts";
import java from "../src/languages/java.ts";
import javascript from "../src/languages/javascript.ts";
import json from "../src/languages/json.ts";
import php from "../src/languages/php.ts";
import python from "../src/languages/python.ts";
import ruby from "../src/languages/ruby.ts";
import rust from "../src/languages/rust.ts";
import sqlLang from "../src/languages/sql.ts";
import typescript from "../src/languages/typescript.ts";
import yamlLang from "../src/languages/yaml.ts";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function whitespaceless(tokenizer, source) {
  return tokenizer.tokenize(source).filter((t) => t.type !== "whitespace");
}

function kinds(tokenizer, source) {
  return whitespaceless(tokenizer, source).map((t) => `${t.type}:${source.slice(t.start, t.end)}`);
}

function _types(tokenizer, source) {
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
// JavaScript
// ================================================================

const js = new UnifiedTokenizer(javascript);

test("JS: keywords", () => {
  assertEquals(kinds(js, "const x = 1;"), [
    "keyword:const",
    "variable:x",
    "operator:=",
    "number:1",
    "punctuation:;",
  ]);
});

test("JS: booleans and null", () => {
  assertEquals(kinds(js, "true false null"), ["boolean:true", "boolean:false", "null:null"]);
});

test("JS: constants (UPPER_CASE and globals)", () => {
  assertEquals(kinds(js, "const MAX = 10;"), [
    "keyword:const",
    "constant:MAX",
    "operator:=",
    "number:10",
    "punctuation:;",
  ]);
});

test("JS: console is constant", () => {
  assertEquals(findToken(js, "console.log(x)", "console").type, "constant");
});

test("JS: function declaration", () => {
  const src = "function add(a, b) { return a + b; }";
  assertEquals(findToken(js, src, "add").type, "function");
  assertEquals(findToken(js, src, "a", 0).type, "parameter");
  assertEquals(findToken(js, src, "b", 0).type, "parameter");
  assertEquals(findToken(js, src, "return").type, "control");
});

test("JS: arrow function", () => {
  const src = "const add = (a, b) => a + b;";
  assertEquals(findToken(js, src, "a", 0).type, "parameter");
  assertEquals(findToken(js, src, "b", 0).type, "parameter");
  assertEquals(findToken(js, src, "=>").type, "operator");
});

test("JS: class declaration", () => {
  const src = "class Foo extends Bar { constructor() { super(); } }";
  assertEquals(findToken(js, src, "Foo").type, "class");
  assertEquals(findToken(js, src, "Bar").type, "class");
  assertEquals(findToken(js, src, "constructor").type, "function");
  assertEquals(findToken(js, src, "super").type, "keyword");
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

test("JS: method call", () => {
  const src = "obj.run()";
  assertEquals(findToken(js, src, "obj").type, "variable");
  assertEquals(findToken(js, src, "run").type, "method");
});

test("JS: template literals", () => {
  const src = "`hello ${name}, count: ${n + 1}`";
  assertEquals(findToken(js, src, "name").type, "variable");
  assertEquals(findToken(js, src, "n", 0).type, "variable");
  assertEquals(findToken(js, src, "1").type, "number");
});

test("JS: strings", () => {
  assertEquals(findToken(js, "const x = 'single'", "x").type, "variable");
  assertEquals(kinds(js, "'single'"), ["string:'single'"]);
  assertEquals(kinds(js, '"double"'), ['string:"double"']);
  assertEquals(kinds(js, "`template`"), ["string:`template`"]);
});

test("JS: numbers", () => {
  assertEquals(kinds(js, "42"), ["number:42"]);
  assertEquals(kinds(js, "3.14"), ["number:3.14"]);
  assertEquals(kinds(js, "0xFF"), ["number:0xFF"]);
  assertEquals(kinds(js, "1_000_000"), ["number:1_000_000"]);
});

test("JS: regex", () => {
  assertEquals(kinds(js, "/^[a-z]+$/gi"), ["regex:/^[a-z]+$/gi"]);
  assertEquals(kinds(js, "return /test/;"), ["control:return", "regex:/test/", "punctuation:;"]);
});

test("JS: operators", () => {
  const src = "a === b !== c <= d >= e && f || g ?? h";
  const opTypes = whitespaceless(js, src)
    .filter((t) => t.type === "operator")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(opTypes, ["===", "!==", "<=", ">=", "&&", "||", "??"]);
});

test("JS: destructuring", () => {
  const src = "const { a, b: c, ...rest } = obj;";
  assertEquals(findToken(js, src, "a", 0).type, "variable");
  assertEquals(findToken(js, src, "b").type, "property");
  assertEquals(findToken(js, src, "c", 0).type, "variable");
  assertEquals(findToken(js, src, "rest", 0).type, "variable");
});

test("JS: imports/exports", () => {
  const src = 'import { foo, bar as baz } from "module";';
  assertEquals(findToken(js, src, "import").type, "keyword");
  assertEquals(findToken(js, src, "foo").type, "variable");
  assertEquals(findToken(js, src, "bar").type, "variable");
  assertEquals(findToken(js, src, "baz").type, "variable");
  assertEquals(findToken(js, src, "from").type, "keyword");
});

test("JS: comments", () => {
  assertEquals(kinds(js, "// line comment"), ["comment:// line comment"]);
  assertEquals(kinds(js, "/* block */"), ["comment:/* block */"]);
});

test("JS: catch parameter", () => {
  const src = "try { x(); } catch (err) { console.log(err); }";
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

test("JS: tokens cover whole source", () => {
  const src = "const a=1;/*c*/let b=`t${b}s`;// x\n";
  let pos = 0;
  for (const t of js.tokenize(src)) {
    assertEquals(t.start, pos);
    pos = t.end;
  }
  assertEquals(pos, src.length);
});

test("JS: empty source", () => {
  assertEquals(js.tokenize("").length, 0);
});

test("JS: whitespace-only", () => {
  const tokens = js.tokenize("   \n\t  ");
  assertEquals(tokens.length, 1);
  assertEquals(tokens[0].type, "whitespace");
});

test("JS: escaped strings", () => {
  assertEquals(kinds(js, '"hello \\"world\\""'), ['string:"hello \\"world\\""']);
});

test("JS: regex with escapes", () => {
  assertEquals(kinds(js, "/foo\\/bar/g"), ["regex:/foo\\/bar/g"]);
});

// ================================================================
// TypeScript
// ================================================================

const ts = new UnifiedTokenizer(typescript);

test("TS: type annotation", () => {
  const src = "const x: number = 42;";
  assertEquals(findToken(ts, src, "x").type, "variable");
  assertEquals(findToken(ts, src, ":").type, "punctuation");
  assertEquals(findToken(ts, src, "number").type, "keyword");
  assertEquals(findToken(ts, src, "42").type, "number");
});

test("TS: interface", () => {
  const src = "interface Props { name: string; readonly id: number; }";
  assertEquals(findToken(ts, src, "Props").type, "class");
  assertEquals(findToken(ts, src, "name").type, "property");
  assertEquals(findToken(ts, src, "string").type, "keyword");
  assertEquals(findToken(ts, src, "readonly").type, "keyword");
  assertEquals(findToken(ts, src, "id").type, "property");
  assertEquals(findToken(ts, src, "number").type, "keyword");
});

test("TS: type alias", () => {
  const src = "type Result<T> = { data: T; error: null };";
  assertEquals(findToken(ts, src, "Result").type, "class");
  assertEquals(findToken(ts, src, "T", 0).type, "constant");
  assertEquals(findToken(ts, src, "data").type, "property");
  assertEquals(findToken(ts, src, "error").type, "property");
  assertEquals(findToken(ts, src, "null").type, "null");
});

test("TS: enum", () => {
  const src = "enum Color { Red, Green, Blue }";
  assertEquals(findToken(ts, src, "enum").type, "keyword");
  assertEquals(findToken(ts, src, "Color").type, "class");
  assertEquals(findToken(ts, src, "Red").type, "variable");
});

test("TS: generics", () => {
  const src = "function identity<T>(arg: T): T { return arg; }";
  assertEquals(findToken(ts, src, "identity").type, "function");
  assertEquals(findToken(ts, src, "T", 0).type, "constant");
  assertEquals(findToken(ts, src, "arg", 0).type, "parameter");
  assertEquals(findToken(ts, src, "arg", 1).type, "parameter");
});

test("TS: satisfies", () => {
  const src = "const config = { port: 8080 } satisfies Options;";
  assertEquals(findToken(ts, src, "satisfies").type, "keyword");
  assertEquals(findToken(ts, src, "Options").type, "variable");
});

test("TS: keyof", () => {
  const src = "type Keys = keyof Props;";
  assertEquals(findToken(ts, src, "keyof").type, "keyword");
});

test("TS: infer", () => {
  const src = "type T = U extends infer V ? V : never;";
  assertEquals(findToken(ts, src, "infer").type, "keyword");
  assertEquals(findToken(ts, src, "never").type, "keyword");
});

// ================================================================
// HTML
// ================================================================

const htmlTok = new UnifiedTokenizer(html);

test("HTML: tags", () => {
  const src = "<div>text</div>";
  assertEquals(findToken(htmlTok, src, "div", 0).type, "tag");
  assertEquals(findToken(htmlTok, src, "div", 1).type, "tag");
});

test("HTML: attributes", () => {
  const src = '<a href="/url" class="link">text</a>';
  assertEquals(findToken(htmlTok, src, "href").type, "attribute");
  assertEquals(findToken(htmlTok, src, "class").type, "attribute");
});

test("HTML: self-closing", () => {
  assertEquals(findToken(htmlTok, "<br/>", "br").type, "tag");
  assertEquals(findToken(htmlTok, '<img src="x"/>', "img").type, "tag");
});

test("HTML: comments", () => {
  assertEquals(findToken(htmlTok, "<!-- comment -->", "<!-- comment -->").type, "comment");
});

test("HTML: embedded script", () => {
  const src = "<script>const x = 42;</script>";
  assertEquals(findToken(htmlTok, src, "const").type, "keyword");
  assertEquals(findToken(htmlTok, src, "42").type, "number");
});

test("HTML: doctype", () => {
  const src = "<!DOCTYPE html>";
  assertEquals(findToken(htmlTok, src, "DOCTYPE").type, "tag");
  assertEquals(findToken(htmlTok, src, "html").type, "tag");
});

test("HTML: nested tags", () => {
  const src = "<div><span><b>bold</b></span></div>";
  assertEquals(findToken(htmlTok, src, "div").type, "tag");
  assertEquals(findToken(htmlTok, src, "span").type, "tag");
  assertEquals(findToken(htmlTok, src, "b", 0).type, "tag");
  assertEquals(findToken(htmlTok, src, "b", 1).type, "tag");
});

// ================================================================
// CSS
// ================================================================

const cssTok = new UnifiedTokenizer(css);

test("CSS: class selector", () => {
  assertEquals(kinds(cssTok, ".app { }"), [
    "punctuation:.",
    "property:app",
    "punctuation:{",
    "punctuation:}",
  ]);
});

test("CSS: id selector", () => {
  assertEquals(kinds(cssTok, "#title { }"), [
    "punctuation:#",
    "property:title",
    "punctuation:{",
    "punctuation:}",
  ]);
});

test("CSS: properties", () => {
  const src = "body { color: red; }";
  assertEquals(findToken(cssTok, src, "body").type, "variable");
  assertEquals(findToken(cssTok, src, "color").type, "variable");
  assertEquals(findToken(cssTok, src, "red").type, "variable");
});

test("CSS: numbers", () => {
  const src = "font-size: 16px;";
  assertEquals(findToken(cssTok, src, "16").type, "number");
});

test("CSS: at-rules use decorator", () => {
  assertEquals(
    kinds(cssTok, "@media (max-width: 768px) { .app { display: none; } }")[0],
    "decorator:@media",
  );
});

// ================================================================
// JSON
// ================================================================

const jsonTok = new UnifiedTokenizer(json);

test("JSON: object keys", () => {
  const src = '{"name": "John", "age": 30}';
  assertEquals(findToken(jsonTok, src, '"name"').type, "key");
  assertEquals(findToken(jsonTok, src, '"John"').type, "string");
  assertEquals(findToken(jsonTok, src, '"age"').type, "key");
  assertEquals(findToken(jsonTok, src, "30").type, "number");
});

test("JSON: nested objects", () => {
  const src = '{"user": {"name": "John"}}';
  assertEquals(findToken(jsonTok, src, '"user"').type, "key");
  assertEquals(findToken(jsonTok, src, '"name"').type, "key");
});

test("JSON: booleans and null", () => {
  const src = '{"active": true, "data": null}';
  assertEquals(findToken(jsonTok, src, "true").type, "boolean");
  assertEquals(findToken(jsonTok, src, "null").type, "null");
});

// ================================================================
// Python
// ================================================================

const py = new UnifiedTokenizer(python);

test("Python: keywords", () => {
  assertEquals(kinds(py, "def hello():"), [
    "keyword:def",
    "function:hello",
    "punctuation:(",
    "punctuation:)",
    "operator::",
  ]);
});

test("Python: booleans and None", () => {
  assertEquals(kinds(py, "True False None"), ["boolean:True", "boolean:False", "null:None"]);
});

test("Python: strings", () => {
  assertEquals(kinds(py, "'single'"), ["string:'single'"]);
  assertEquals(kinds(py, '"double"'), ['string:"double"']);
  assertEquals(kinds(py, '"""triple"""'), ['string:"""triple"""']);
});

test("Python: decorators", () => {
  const src = "@staticmethod\ndef func(): pass";
  assertEquals(findToken(py, src, "@staticmethod").type, "decorator");
});

test("Python: class", () => {
  const src = "class Dog:\n    def __init__(self, name):\n        self.name = name";
  assertEquals(findToken(py, src, "Dog").type, "variable");
  assertEquals(findToken(py, src, "__init__").type, "function");
  assertEquals(findToken(py, src, "self", 0).type, "variable");
  assertEquals(findToken(py, src, "name", 0).type, "variable");
});

test("Python: list comprehension", () => {
  const src = "squares = [x**2 for x in range(10)]";
  assertEquals(findToken(py, src, "for").type, "control");
  assertEquals(findToken(py, src, "in").type, "keyword");
});

test("Python: f-strings", () => {
  const src = "f'hello {name}'";
  const k = kinds(py, src);
  assert(
    k.some((x) => x.includes("name")),
    `expected "name" token in ${JSON.stringify(k)}`,
  );
});

test("Python: type hints", () => {
  const src = "def greet(name: str) -> str:";
  assertEquals(findToken(py, src, "name", 0).type, "variable");
  assertEquals(findToken(py, src, "str", 0).type, "variable");
  assertEquals(findToken(py, src, "->").type, "operator");
});

test("Python: walrus operator", () => {
  const src = "if (n := len(a)) > 10:";
  assertEquals(findToken(py, src, ":=").type, "operator");
});

test("Python: match/case", () => {
  const src = "match command:\n    case 'quit': pass";
  assertEquals(findToken(py, src, "match").type, "keyword");
  assertEquals(findToken(py, src, "case").type, "control");
});

// ================================================================
// Go
// ================================================================

const goTok = new UnifiedTokenizer(go);

test("Go: basics", () => {
  const src = 'package main\nimport "fmt"';
  assertEquals(findToken(goTok, src, "package").type, "keyword");
  assertEquals(findToken(goTok, src, "main").type, "variable");
  assertEquals(findToken(goTok, src, "import").type, "keyword");
});

test("Go: function", () => {
  const src = "func main() { fmt.Println(42) }";
  assertEquals(findToken(goTok, src, "func").type, "keyword");
  assertEquals(findToken(goTok, src, "Println").type, "function");
});

test("Go: struct", () => {
  const src = "type Point struct { X, Y int }";
  assertEquals(findToken(goTok, src, "type").type, "keyword");
  assertEquals(findToken(goTok, src, "Point").type, "variable");
  assertEquals(findToken(goTok, src, "struct").type, "keyword");
});

test("Go: method", () => {
  const src = "func (p Point) Distance() float64 { return 0 }";
  assertEquals(findToken(goTok, src, "Distance").type, "function");
});

test("Go: interface", () => {
  const src = "type Reader interface { Read(p []byte) (n int, err error) }";
  assertEquals(findToken(goTok, src, "interface").type, "keyword");
  assertEquals(findToken(goTok, src, "Read").type, "function");
});

test("Go: error handling", () => {
  const src = 'if err != nil { return fmt.Errorf("failed") }';
  assertEquals(findToken(goTok, src, "err").type, "variable");
  assertEquals(findToken(goTok, src, "nil").type, "null");
  assertEquals(findToken(goTok, src, "return").type, "control");
  assertEquals(findToken(goTok, src, "Errorf").type, "function");
});

// ================================================================
// Rust
// ================================================================

const rustTok = new UnifiedTokenizer(rust);

test("Rust: basics", () => {
  const src = 'fn main() { let x: i32 = 42; let name = "hello"; }';
  assertEquals(findToken(rustTok, src, "fn").type, "keyword");
  assertEquals(findToken(rustTok, src, "main").type, "function");
  assertEquals(findToken(rustTok, src, "let").type, "keyword");
  assertEquals(findToken(rustTok, src, "x").type, "variable");
  assertEquals(findToken(rustTok, src, "42").type, "number");
  assertEquals(findToken(rustTok, src, "name").type, "variable");
});

test("Rust: struct", () => {
  const src = "struct Point { x: f64, y: f64 }";
  assertEquals(findToken(rustTok, src, "struct").type, "keyword");
  assertEquals(findToken(rustTok, src, "Point").type, "variable");
});

test("Rust: impl", () => {
  const src = "impl Point { fn distance(&self) -> f64 { 0.0 } }";
  assertEquals(findToken(rustTok, src, "impl").type, "keyword");
  assertEquals(findToken(rustTok, src, "distance").type, "function");
  assertEquals(findToken(rustTok, src, "self").type, "keyword");
});

test("Rust: enum", () => {
  const src = "enum Shape { Circle(f64), Rectangle(f64, f64) }";
  assertEquals(findToken(rustTok, src, "enum").type, "keyword");
  assertEquals(findToken(rustTok, src, "Shape").type, "variable");
  assertEquals(findToken(rustTok, src, "Circle").type, "function");
  assertEquals(findToken(rustTok, src, "Rectangle").type, "function");
});

test("Rust: trait", () => {
  const src = "trait Drawable { fn draw(&self); }";
  assertEquals(findToken(rustTok, src, "trait").type, "keyword");
  assertEquals(findToken(rustTok, src, "Drawable").type, "variable");
  assertEquals(findToken(rustTok, src, "draw").type, "function");
});

test("Rust: raw strings", () => {
  const k = kinds(rustTok, 'r#"raw string"#');
  assert(
    k.some((x) => x.startsWith("string:")),
    `expected string token in ${JSON.stringify(k)}`,
  );
});

test("Rust: byte strings", () => {
  const k = kinds(rustTok, 'b"bytes"');
  assert(
    k.some((x) => x.startsWith("string:")),
    `expected string token in ${JSON.stringify(k)}`,
  );
});

// ================================================================
// Java
// ================================================================

const javaTok = new UnifiedTokenizer(java);

test("Java: class", () => {
  const src = "public class App { private String name; }";
  assertEquals(findToken(javaTok, src, "public").type, "keyword");
  assertEquals(findToken(javaTok, src, "class").type, "keyword");
  assertEquals(findToken(javaTok, src, "App").type, "variable");
  assertEquals(findToken(javaTok, src, "private").type, "keyword");
});

test("Java: interface", () => {
  const src = "interface Serializable {}";
  assertEquals(findToken(javaTok, src, "interface").type, "keyword");
  assertEquals(findToken(javaTok, src, "Serializable").type, "variable");
});

test("Java: enum", () => {
  const src = "enum Status { ACTIVE, INACTIVE, PENDING }";
  assertEquals(findToken(javaTok, src, "enum").type, "keyword");
  assertEquals(findToken(javaTok, src, "ACTIVE").type, "constant");
});

test("Java: lambda", () => {
  const src = "items.stream().filter(s -> !s.isEmpty())";
  assertEquals(findToken(javaTok, src, "stream").type, "function");
  assertEquals(findToken(javaTok, src, "filter").type, "function");
  assertEquals(findToken(javaTok, src, "isEmpty").type, "function");
});

// ================================================================
// C
// ================================================================

const cTok = new UnifiedTokenizer(cLang);

test("C: basics", () => {
  const src = "int main(void) { return 0; }";
  assertEquals(findToken(cTok, src, "int").type, "keyword");
  assertEquals(findToken(cTok, src, "main").type, "function");
  assertEquals(findToken(cTok, src, "void").type, "keyword");
  assertEquals(findToken(cTok, src, "return").type, "control");
  assertEquals(findToken(cTok, src, "0").type, "number");
});

test("C: preprocessor", () => {
  assertEquals(kinds(cTok, "#define MAX 100"), [
    "punctuation:#",
    "property:define",
    "constant:MAX",
    "number:100",
  ]);
});

test("C: struct", () => {
  const src = "struct Point { int x; int y; };";
  assertEquals(findToken(cTok, src, "struct").type, "keyword");
  assertEquals(findToken(cTok, src, "Point").type, "variable");
});

test("C: pointers", () => {
  const src = "int *p = &x;";
  assertEquals(findToken(cTok, src, "*").type, "operator");
  assertEquals(findToken(cTok, src, "&").type, "operator");
});

test("C: strings", () => {
  assertEquals(kinds(cTok, '"hello"'), ['string:"hello"']);
  assertEquals(kinds(cTok, "'c'"), ["string:'c'"]);
});

// ================================================================
// C++
// ================================================================

const cppTok = new UnifiedTokenizer(cpp);

test("C++: class", () => {
  const src = "class Widget { public: Widget(int id); virtual ~Widget(); };";
  assertEquals(findToken(cppTok, src, "class").type, "keyword");
  assertEquals(findToken(cppTok, src, "public").type, "keyword");
  assertEquals(findToken(cppTok, src, "virtual").type, "keyword");
});

test("C++: template", () => {
  const src = "template<typename T> T max(T a, T b) { return a; }";
  assertEquals(findToken(cppTok, src, "template").type, "keyword");
  assertEquals(findToken(cppTok, src, "typename").type, "keyword");
  assertEquals(findToken(cppTok, src, "max").type, "function");
});

// ================================================================
// Ruby
// ================================================================

const rubyTok = new UnifiedTokenizer(ruby);

test("Ruby: basics", () => {
  const src = 'x = 42; name = "hello"';
  assertEquals(findToken(rubyTok, src, "x").type, "variable");
  assertEquals(findToken(rubyTok, src, "42").type, "number");
  assertEquals(findToken(rubyTok, src, "name").type, "variable");
});

test("Ruby: booleans and nil", () => {
  assertEquals(kinds(rubyTok, "true nil"), ["boolean:true", "null:nil"]);
});

test("literal lists win over keywords (no double-classification)", () => {
  // A word present in both `keywords` and `booleans`/`nulls` must be classified
  // by its literal role, not as a keyword (regression for shadowing bug).
  const lang = {
    name: "doublelit",
    keywords: ["true", "false", "null"],
    booleans: ["true", "false"],
    nulls: ["null"],
  };
  const tok = new UnifiedTokenizer(lang);
  assertEquals(kinds(tok, "true false null"), [
    "boolean:true",
    "boolean:false",
    "null:null",
  ]);
});

test("Ruby: class", () => {
  const src = "class Dog\n  def initialize(name)\n  end\nend";
  assertEquals(findToken(rubyTok, src, "class").type, "keyword");
  assertEquals(findToken(rubyTok, src, "Dog").type, "variable");
  assertEquals(findToken(rubyTok, src, "def").type, "keyword");
  assertEquals(findToken(rubyTok, src, "initialize").type, "function");
  assertEquals(findToken(rubyTok, src, "end", 0).type, "keyword");
});

test("Ruby: instance variable", () => {
  const src = "@name = 'test'";
  assertEquals(findToken(rubyTok, src, "@name").type, "decorator");
});

// ================================================================
// PHP
// ================================================================

const phpTok = new UnifiedTokenizer(php);

test("PHP: variables", () => {
  const src = "$x = 42;";
  assertEquals(findToken(phpTok, src, "$").type, "operator");
  assertEquals(findToken(phpTok, src, "x").type, "variable");
  assertEquals(findToken(phpTok, src, "42").type, "number");
});

test("PHP: class", () => {
  const src = "class App { public function __construct() {} }";
  assertEquals(findToken(phpTok, src, "class").type, "keyword");
  assertEquals(findToken(phpTok, src, "App").type, "variable");
  assertEquals(findToken(phpTok, src, "public").type, "keyword");
  assertEquals(findToken(phpTok, src, "function").type, "keyword");
  assertEquals(findToken(phpTok, src, "__construct").type, "function");
});

test("PHP: booleans", () => {
  assertEquals(findToken(phpTok, "true", "true").type, "boolean");
});

// ================================================================
// Bash
// ================================================================

const bashTok = new UnifiedTokenizer(bashLang);

test("Bash: shebang is comment", () => {
  assertEquals(findToken(bashTok, "#!/bin/bash", "#!/bin/bash").type, "comment");
});

test("Bash: constants", () => {
  const src = 'NAME="world"';
  assertEquals(findToken(bashTok, src, "NAME").type, "constant");
});

test("Bash: keywords", () => {
  assertEquals(kinds(bashTok, "if true; then echo x; fi"), [
    "control:if",
    "boolean:true",
    "operator:;",
    "keyword:then",
    "keyword:echo",
    "variable:x",
    "operator:;",
    "keyword:fi",
  ]);
});

test("Bash: function", () => {
  const src = "build() { npm run build; }";
  assertEquals(findToken(bashTok, src, "build", 0).type, "function");
});

// ================================================================
// YAML
// ================================================================

const yamlTok = new UnifiedTokenizer(yamlLang);

test("YAML: mapping", () => {
  const src = "name: John\nage: 30";
  assertEquals(findToken(yamlTok, src, "name").type, "variable");
  assertEquals(findToken(yamlTok, src, "John").type, "variable");
  assertEquals(findToken(yamlTok, src, "age").type, "variable");
  assertEquals(findToken(yamlTok, src, "30").type, "number");
});

test("YAML: booleans", () => {
  assertEquals(findToken(yamlTok, "active: true", "true").type, "boolean");
});

test("YAML: list items", () => {
  const src = "items:\n  - item1\n  - item2";
  assertEquals(findToken(yamlTok, src, "items").type, "variable");
  assertEquals(findToken(yamlTok, src, "item1").type, "variable");
});

// ================================================================
// SQL
// ================================================================

const sqlTok = new UnifiedTokenizer(sqlLang);

test("SQL: SELECT", () => {
  const src = "SELECT u.name FROM users WHERE u.active = true LIMIT 100;";
  assertEquals(findToken(sqlTok, src, "SELECT").type, "keyword");
  assertEquals(findToken(sqlTok, src, "FROM").type, "keyword");
  assertEquals(findToken(sqlTok, src, "WHERE").type, "keyword");
  assertEquals(findToken(sqlTok, src, "LIMIT").type, "keyword");
  assertEquals(findToken(sqlTok, src, "100").type, "number");
  assertEquals(findToken(sqlTok, src, "true").type, "boolean");
});

test("SQL: CREATE TABLE", () => {
  const src = "CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL);";
  assertEquals(findToken(sqlTok, src, "CREATE").type, "keyword");
  assertEquals(findToken(sqlTok, src, "TABLE").type, "keyword");
  assertEquals(findToken(sqlTok, src, "PRIMARY").type, "keyword");
  assertEquals(findToken(sqlTok, src, "KEY").type, "keyword");
  assertEquals(findToken(sqlTok, src, "NOT").type, "keyword");
  assertEquals(findToken(sqlTok, src, "NULL").type, "null");
  assertEquals(findToken(sqlTok, src, "255").type, "number");
});

// ================================================================
// Cross-language edge cases
// ================================================================

test("edge: empty input", () => {
  const tok = new UnifiedTokenizer(javascript);
  assertEquals(tok.tokenize("").length, 0);
});

test("edge: whitespace only", () => {
  const tok = new UnifiedTokenizer(javascript);
  const tokens = tok.tokenize("   \n\t  ");
  assertEquals(tokens.length, 1);
  assertEquals(tokens[0].type, "whitespace");
});

test("edge: tokens cover whole source (JS)", () => {
  const sources = [
    "const x = 1;",
    'function f() { return "hello"; }',
    "/* comment */ // line",
    "`template ${x}`",
    "/regex/gi",
  ];
  for (const src of sources) {
    let pos = 0;
    for (const t of js.tokenize(src)) {
      assertEquals(t.start, pos, `Token start mismatch in "${src}"`);
      pos = t.end;
    }
    assertEquals(pos, src.length, `Source length mismatch in "${src}"`);
  }
});

test("edge: unicode identifiers", () => {
  const src = "const π = 3.14;";
  assertEquals(findToken(js, src, "π").type, "variable");
});

test("edge: deeply nested expressions", () => {
  const src = "foo(bar(baz(qux())))";
  assertEquals(findToken(js, src, "foo").type, "function");
  assertEquals(findToken(js, src, "bar").type, "function");
  assertEquals(findToken(js, src, "baz").type, "function");
  assertEquals(findToken(js, src, "qux").type, "function");
});

test("edge: operator precedence", () => {
  const src = "a + b * c - d / e";
  const ops = whitespaceless(js, src)
    .filter((t) => t.type === "operator")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(ops, ["+", "*", "-", "/"]);
});

// ================================================================
// Advanced: HTML embedded JS
// ================================================================

test("advanced: <script> basic JS", () => {
  const src = "<script>const x = 42;</script>";
  const tokens = whitespaceless(htmlTok, src);
  assertEquals(tokens[0].type, "punctuation"); // <
  assertEquals(tokens[1].type, "tag"); // script
  assertEquals(tokens[2].type, "punctuation"); // >
  assertEquals(tokens[3].type, "keyword"); // const
  assertEquals(tokens[4].type, "variable"); // x
  assertEquals(tokens[5].type, "operator"); // =
  assertEquals(tokens[6].type, "number"); // 42
  assertEquals(tokens[7].type, "punctuation"); // ;
});

test("advanced: <script> with function", () => {
  const src = '<script>function greet(name) { return "hi " + name; }</script>';
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "function").type, "keyword");
  assertEquals(findToken(htmlTok, src, "greet").type, "function");
  assertEquals(findToken(htmlTok, src, "name").type, "parameter");
  assertEquals(findToken(htmlTok, src, "return").type, "control");
});

test("advanced: <script> with if/else", () => {
  const src = "<script>if (x > 0) { console.log(x); } else { console.log(0); }</script>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "if").type, "control");
  assertEquals(findToken(htmlTok, src, "else").type, "control");
  assertEquals(findToken(htmlTok, src, "console").type, "constant");
  assertEquals(findToken(htmlTok, src, "log").type, "method");
});

test("advanced: <script> with class", () => {
  const src = "<script>class Foo { constructor() { this.x = 1; } }</script>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "class").type, "keyword");
  assertEquals(findToken(htmlTok, src, "Foo").type, "class");
  assertEquals(findToken(htmlTok, src, "constructor").type, "function");
  assertEquals(findToken(htmlTok, src, "this").type, "keyword");
});

test("advanced: <script> with arrow and spread", () => {
  const src = "<script>const arr = [1, 2, 3]; arr.map(x => x * 2);</script>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "arr").type, "variable");
  assertEquals(findToken(htmlTok, src, "map").type, "method");
  assertEquals(findToken(htmlTok, src, "x").type, "parameter");
  assertEquals(findToken(htmlTok, src, "=>").type, "operator");
});

test("advanced: <script> with comments", () => {
  const src = "<script>/* block */ // line\nconst a = 1;</script>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "/* block */").type, "comment");
  assertEquals(findToken(htmlTok, src, "// line").type, "comment");
  assertEquals(findToken(htmlTok, src, "const").type, "keyword");
});

test("advanced: <script> with regex", () => {
  const src = "<script>const re = /^[a-z]+$/gi;</script>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "re").type, "variable");
  assertEquals(findToken(htmlTok, src, "/^[a-z]+$/gi").type, "regex");
});

// ================================================================
// Advanced: HTML embedded CSS
// ================================================================

test("advanced: <style> basic CSS", () => {
  const src = "<style>.app { color: red; }</style>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "style").type, "tag");
  assertEquals(findToken(htmlTok, src, ".").type, "punctuation");
  assertEquals(findToken(htmlTok, src, "app").type, "property");
  assertEquals(findToken(htmlTok, src, "color").type, "variable");
  assertEquals(findToken(htmlTok, src, "red").type, "variable");
});

test("advanced: <style> ID and class selectors", () => {
  const src = "<style>#title { font-size: 24px; } .active { display: flex; }</style>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "#").type, "punctuation");
  assertEquals(findToken(htmlTok, src, "title").type, "property");
  assertEquals(findToken(htmlTok, src, "24").type, "number");
  assertEquals(findToken(htmlTok, src, "px").type, "variable");
  assertEquals(findToken(htmlTok, src, "display").type, "variable");
  assertEquals(findToken(htmlTok, src, "flex").type, "variable");
});

test("advanced: <style> with @media", () => {
  const src = "<style>@media (max-width: 768px) { .app { display: none; } }</style>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "@media").type, "decorator");
  assertEquals(findToken(htmlTok, src, "max-width").type, "variable");
  assertEquals(findToken(htmlTok, src, "768").type, "number");
  assertEquals(findToken(htmlTok, src, "px").type, "variable");
  assertEquals(findToken(htmlTok, src, "none").type, "variable");
});

test("advanced: mixed <style> and <script>", () => {
  const src =
    "<html><head><style>.x{color:red}</style></head><body><script>var y=1;</script></body></html>";
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "html").type, "tag");
  assertEquals(findToken(htmlTok, src, "style").type, "tag");
  assertEquals(findToken(htmlTok, src, "color").type, "variable");
  assertEquals(findToken(htmlTok, src, "red").type, "variable");
  assertEquals(findToken(htmlTok, src, "script").type, "tag");
  assertEquals(findToken(htmlTok, src, "var").type, "keyword");
  assertEquals(findToken(htmlTok, src, "y").type, "variable");
});

// ================================================================
// Advanced: HTML attributes
// ================================================================

test("advanced: multiple attributes", () => {
  const src = '<div class="app" id="root" data-value="42">Hello <strong>World</strong></div>';
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "div").type, "tag");
  assertEquals(findToken(htmlTok, src, "class").type, "attribute");
  assertEquals(findToken(htmlTok, src, '"app"').type, "string");
  assertEquals(findToken(htmlTok, src, "id").type, "attribute");
  assertEquals(findToken(htmlTok, src, '"root"').type, "string");
  assertEquals(findToken(htmlTok, src, "data-value").type, "attribute");
  assertEquals(findToken(htmlTok, src, '"42"').type, "string");
  assertEquals(findToken(htmlTok, src, "Hello ").type, "text");
  assertEquals(findToken(htmlTok, src, "strong").type, "tag");
});

test("advanced: boolean and self-closing attributes", () => {
  const src = '<input type="text" disabled required autocomplete="off" />';
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "input").type, "tag");
  assertEquals(findToken(htmlTok, src, "disabled").type, "attribute");
  assertEquals(findToken(htmlTok, src, "required").type, "attribute");
  assertEquals(findToken(htmlTok, src, "autocomplete").type, "attribute");
  assertEquals(findToken(htmlTok, src, '"off"').type, "string");
});

test("advanced: self-closing img with many attrs", () => {
  const src = '<img src="photo.jpg" alt="Photo" width="300" height="200" />';
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "img").type, "tag");
  assertEquals(findToken(htmlTok, src, "src").type, "attribute");
  assertEquals(findToken(htmlTok, src, "alt").type, "attribute");
  assertEquals(findToken(htmlTok, src, "width").type, "attribute");
  assertEquals(findToken(htmlTok, src, "height").type, "attribute");
});

test("advanced: anchor with URL query and hash", () => {
  const src = '<a href="/path?q=1&r=2#section">Link</a>';
  const _tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "a").type, "tag");
  assertEquals(findToken(htmlTok, src, "href").type, "attribute");
  assertEquals(findToken(htmlTok, src, '"/path?q=1&r=2#section"').type, "string");
  assertEquals(findToken(htmlTok, src, "Link").type, "text");
});

// ================================================================
// Advanced: JS template literals
// ================================================================

test("advanced: nested template literals", () => {
  const src = "`hello ${`nested ${x}`}`";
  const _tokens = whitespaceless(js, src);
  assertEquals(findToken(js, src, "`hello ").type, "string");
  assertEquals(findToken(js, src, "x").type, "variable");
});

test("advanced: template with nested object", () => {
  const src = "`${fn({a: 1, b: [2, 3]})}`";
  const _tokens = whitespaceless(js, src);
  assertEquals(findToken(js, src, "fn").type, "function");
  assertEquals(findToken(js, src, "a").type, "property");
  assertEquals(findToken(js, src, "b").type, "property");
});

test("advanced: multiline template literal", () => {
  const src = "`line1\nline2\nline3`";
  const tokens = whitespaceless(js, src);
  assertEquals(tokens.length, 1);
  assertEquals(tokens[0].type, "string");
});

test("advanced: template with multiple interpolations", () => {
  const src = "const msg = `hello ${name}, you have ${count} items`;";
  const _tokens = whitespaceless(js, src);
  assertEquals(findToken(js, src, "const").type, "keyword");
  assertEquals(findToken(js, src, "msg").type, "variable");
  assertEquals(findToken(js, src, "name").type, "variable");
  assertEquals(findToken(js, src, "count").type, "variable");
});

test("advanced: template with ternary interpolation", () => {
  const src = "`${a ? `${b}` : `${c}`}`";
  const _tokens = whitespaceless(js, src);
  assertEquals(findToken(js, src, "a").type, "variable");
  assertEquals(findToken(js, src, "?").type, "operator");
  assertEquals(findToken(js, src, "b").type, "variable");
  assertEquals(findToken(js, src, ":").type, "punctuation");
  assertEquals(findToken(js, src, "c").type, "variable");
});

// ================================================================
// Advanced: JS deeply nested structures
// ================================================================

test("advanced: nested function declarations", () => {
  const src =
    "function outer() { function inner() { function deepest() { return 42; } return deepest(); } return inner(); }";
  assertEquals(findToken(js, src, "outer").type, "function");
  assertEquals(findToken(js, src, "inner").type, "function");
  assertEquals(findToken(js, src, "deepest").type, "function");
  assertEquals(findToken(js, src, "return").type, "control");
});

test("advanced: deeply nested objects", () => {
  const src = "const x = { a: { b: { c: { d: 1 } } } };";
  const props = whitespaceless(js, src)
    .filter((t) => t.type === "property")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(props, ["a", "b", "c", "d"]);
});

test("advanced: complex boolean logic", () => {
  const src = "if (a && b || (c && d) || !(e || f)) { x(); }";
  const ops = whitespaceless(js, src)
    .filter((t) => t.type === "operator")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(ops.includes("&&"), true);
  assertEquals(ops.includes("||"), true);
  assertEquals(ops.includes("!"), true);
  assertEquals(findToken(js, src, "if").type, "control");
  assertEquals(findToken(js, src, "x").type, "function");
});

test("advanced: try/catch/finally", () => {
  const src = "try { risky(); } catch (e) { recover(); } finally { cleanup(); }";
  assertEquals(findToken(js, src, "try").type, "control");
  assertEquals(findToken(js, src, "catch").type, "control");
  assertEquals(findToken(js, src, "finally").type, "control");
  assertEquals(findToken(js, src, "risky").type, "function");
  assertEquals(findToken(js, src, "recover").type, "function");
  assertEquals(findToken(js, src, "cleanup").type, "function");
  assertEquals(findToken(js, src, "e").type, "parameter");
});

test("advanced: nested for loops", () => {
  const src =
    "for (let i = 0; i < arr.length; i++) { for (let j = 0; j < arr[i].length; j++) { sum += arr[i][j]; } }";
  const keywords = whitespaceless(js, src)
    .filter((t) => t.type === "keyword" || t.type === "control")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(keywords, ["for", "let", "for", "let"]);
  assertEquals(findToken(js, src, "length").type, "property");
  assertEquals(findToken(js, src, "++").type, "operator");
  assertEquals(findToken(js, src, "+=").type, "operator");
});

test("advanced: curried arrow functions", () => {
  const src = "const f = (a) => (b) => (c) => a + b + c;";
  const arrows = whitespaceless(js, src).filter(
    (t) => t.type === "operator" && src.slice(t.start, t.end) === "=>",
  );
  assertEquals(arrows.length, 3);
  const params = whitespaceless(js, src).filter((t) => t.type === "parameter");
  assertEquals(params.length, 6);
});

test("advanced: deeply nested array flat", () => {
  const src = "[1, [2, [3, [4]]]].flat(Infinity)";
  assertEquals(findToken(js, src, "1").type, "number");
  assertEquals(findToken(js, src, "2").type, "number");
  assertEquals(findToken(js, src, "3").type, "number");
  assertEquals(findToken(js, src, "4").type, "number");
  assertEquals(findToken(js, src, "flat").type, "method");
  assertEquals(findToken(js, src, "Infinity").type, "constant");
});

// ================================================================
// Advanced: JS number edge cases
// ================================================================

test("advanced: number formats", () => {
  assertEquals(findToken(js, ".5", ".5").type, "number");
  assertEquals(findToken(js, "1e10", "1e10").type, "number");
  assertEquals(findToken(js, "1.5e-3", "1.5e-3").type, "number");
  assertEquals(findToken(js, "0o77", "0o77").type, "number");
  assertEquals(findToken(js, "0b1010", "0b1010").type, "number");
  assertEquals(findToken(js, "3.14", "3.14").type, "number");
  // 0. is now tokenized as number:0 + punctuation:. (dot is no longer greedy)
  assertEquals(findToken(js, "0.", "0").type, "number");
  assertEquals(findToken(js, "0.", ".").type, "punctuation");
});

test("advanced: empty strings", () => {
  assertEquals(findToken(js, "''", "''").type, "string");
  assertEquals(findToken(js, '""', '""').type, "string");
  assertEquals(findToken(js, "``", "``").type, "string");
});

test("advanced: string escapes", () => {
  assertEquals(findToken(js, "'\\n\\t\\r\\\\\\''", "'\\n\\t\\r\\\\\\''").type, "string");
  assertEquals(findToken(js, '"\\n\\t\\r\\\\"', '"\\n\\t\\r\\\\"').type, "string");
  assertEquals(findToken(js, "`\\n\\t\\r`", "`\\n\\t\\r`").type, "string");
  assertEquals(findToken(js, "'\\x41'", "'\\x41'").type, "string");
  assertEquals(findToken(js, "'\\u0041'", "'\\u0041'").type, "string");
  assertEquals(findToken(js, "'\\u{1F600}'", "'\\u{1F600}'").type, "string");
});

// ================================================================
// Advanced: JS optional chaining & nullish
// ================================================================

test("advanced: optional chaining", () => {
  const src = "a?.b?.c?.d";
  const ops = whitespaceless(js, src)
    .filter((t) => t.type === "operator")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(ops, ["?.", "?.", "?."]);
});

test("advanced: nullish coalescing operators", () => {
  assertEquals(findToken(js, "a ?? b ?? c", "??").type, "operator");
  assertEquals(findToken(js, "a ??= b", "??=").type, "operator");
  assertEquals(findToken(js, "a ||= b", "||=").type, "operator");
  assertEquals(findToken(js, "a &&= b", "&&=").type, "operator");
});

test("advanced: optional call and bracket", () => {
  assertEquals(findToken(js, "a?.()", "?.").type, "operator");
  assertEquals(findToken(js, "a?.[0]", "?.").type, "operator");
});

test("advanced: spread operator", () => {
  assertEquals(findToken(js, "...a", "...").type, "operator");
});

// ================================================================
// Advanced: JS regex edge cases
// ================================================================

test("advanced: regex patterns", () => {
  assertEquals(findToken(js, "/a{2,}/g", "/a{2,}/g").type, "regex");
  assertEquals(findToken(js, "/[\\w-]+/g", "/[\\w-]+/g").type, "regex");
  assertEquals(
    findToken(js, "/(?<year>\\d{4})-(?<month>\\d{2})/g", "/(?<year>\\d{4})-(?<month>\\d{2})/g")
      .type,
    "regex",
  );
});

test("advanced: return before regex", () => {
  const src = "return /test/;";
  assertEquals(findToken(js, src, "return").type, "control");
  assertEquals(findToken(js, src, "/test/").type, "regex");
});

// ================================================================
// Advanced: TS mapped types and generics
// ================================================================

test("advanced: TS mapped type", () => {
  const src = "type T = { [key: string]: number | string; };";
  assertEquals(findToken(ts, src, "type").type, "keyword");
  assertEquals(findToken(ts, src, "T").type, "class");
  assertEquals(findToken(ts, src, "key").type, "variable");
  assertEquals(findToken(ts, src, "string").type, "keyword");
  assertEquals(findToken(ts, src, "number").type, "keyword");
});

test("advanced: TS interface with generics", () => {
  const src = "interface A extends B<C> { method(): void; }";
  assertEquals(findToken(ts, src, "interface").type, "keyword");
  assertEquals(findToken(ts, src, "A").type, "class");
  assertEquals(findToken(ts, src, "extends").type, "keyword");
  assertEquals(findToken(ts, src, "B").type, "class");
  assertEquals(findToken(ts, src, "C").type, "constant");
  assertEquals(findToken(ts, src, "method").type, "function");
  assertEquals(findToken(ts, src, "void").type, "keyword");
});

test("advanced: TS as const", () => {
  const src = "const x = { a: 1 } as const;";
  assertEquals(findToken(ts, src, "as").type, "keyword");
  assertEquals(findToken(ts, src, "const").type, "keyword");
});

test("advanced: TS complex generic function", () => {
  const src = "function f<T extends keyof U, U>(key: T): U[T] { return null!; }";
  assertEquals(findToken(ts, src, "function").type, "keyword");
  assertEquals(findToken(ts, src, "f").type, "function");
  assertEquals(findToken(ts, src, "T").type, "constant");
  assertEquals(findToken(ts, src, "extends").type, "keyword");
  assertEquals(findToken(ts, src, "keyof").type, "keyword");
  assertEquals(findToken(ts, src, "U").type, "constant");
  assertEquals(findToken(ts, src, "null").type, "null");
});

test("advanced: TS conditional type", () => {
  const src = "type Unwrap<T> = T extends Promise<infer U> ? U : T;";
  assertEquals(findToken(ts, src, "Unwrap").type, "class");
  assertEquals(findToken(ts, src, "Promise").type, "class");
  assertEquals(findToken(ts, src, "infer").type, "keyword");
  assertEquals(findToken(ts, src, "extends").type, "keyword");
});

// ================================================================
// Advanced: Python advanced constructs
// ================================================================

test("advanced: Python *args **kwargs", () => {
  const src = "def f(a, b=1, *args, **kwargs): pass";
  assertEquals(findToken(py, src, "def").type, "keyword");
  assertEquals(findToken(py, src, "f").type, "function");
  assertEquals(findToken(py, src, "a").type, "variable");
  assertEquals(findToken(py, src, "b").type, "variable");
  assertEquals(findToken(py, src, "args").type, "variable");
  assertEquals(findToken(py, src, "kwargs").type, "variable");
  assertEquals(findToken(py, src, "pass").type, "keyword");
});

test("advanced: Python class inheritance", () => {
  const src = "class A(B, C, metaclass=D): pass";
  assertEquals(findToken(py, src, "class").type, "keyword");
  assertEquals(findToken(py, src, "A").type, "function");
  assertEquals(findToken(py, src, "B").type, "constant");
  assertEquals(findToken(py, src, "C").type, "constant");
  assertEquals(findToken(py, src, "metaclass").type, "variable");
  assertEquals(findToken(py, src, "D").type, "constant");
});

test("advanced: Python list comprehension", () => {
  const src = "x = [i**2 for i in range(10) if i % 2 == 0]";
  assertEquals(findToken(py, src, "x").type, "variable");
  assertEquals(findToken(py, src, "for").type, "control");
  assertEquals(findToken(py, src, "in").type, "keyword");
  assertEquals(findToken(py, src, "range").type, "function");
  assertEquals(findToken(py, src, "if").type, "control");
});

test("advanced: Python with statement", () => {
  const src = "with open('f') as fp: data = fp.read()";
  assertEquals(findToken(py, src, "with").type, "keyword");
  assertEquals(findToken(py, src, "open").type, "function");
  assertEquals(findToken(py, src, "as").type, "keyword");
  assertEquals(findToken(py, src, "fp").type, "variable");
});

test("advanced: Python yield from", () => {
  const src = "yield from iterable";
  assertEquals(findToken(py, src, "yield").type, "control");
  assertEquals(findToken(py, src, "from").type, "keyword");
  assertEquals(findToken(py, src, "iterable").type, "variable");
});

test("advanced: Python assert with message", () => {
  const src = "assert x > 0, 'positive'";
  assertEquals(findToken(py, src, "assert").type, "keyword");
  assertEquals(findToken(py, src, "x").type, "variable");
  assertEquals(findToken(py, src, "'positive'").type, "string");
});

test("advanced: Python nonlocal and global", () => {
  assertEquals(findToken(py, "nonlocal x", "nonlocal").type, "keyword");
  assertEquals(findToken(py, "nonlocal x", "x").type, "variable");
  assertEquals(findToken(py, "global y", "global").type, "keyword");
  assertEquals(findToken(py, "global y", "y").type, "variable");
});

// ================================================================
// Advanced: Go advanced constructs
// ================================================================

test("advanced: Go channels", () => {
  const src = "ch := make(chan int, 10)";
  assertEquals(findToken(goTok, src, "ch").type, "variable");
  assertEquals(findToken(goTok, src, ":=").type, "operator");
  assertEquals(findToken(goTok, src, "make").type, "function");
  assertEquals(findToken(goTok, src, "chan").type, "keyword");
  assertEquals(findToken(goTok, src, "int").type, "variable");
  assertEquals(findToken(goTok, src, "10").type, "number");
});

test("advanced: Go range loop", () => {
  const src = "for i, v := range arr { sum += v }";
  assertEquals(findToken(goTok, src, "for").type, "control");
  assertEquals(findToken(goTok, src, "range").type, "keyword");
  assertEquals(findToken(goTok, src, "arr").type, "variable");
  assertEquals(findToken(goTok, src, "+=").type, "operator");
});

test("advanced: Go select statement", () => {
  const src = "select { case v := <-ch: process(v); }";
  assertEquals(findToken(goTok, src, "select").type, "keyword");
  assertEquals(findToken(goTok, src, "case").type, "control");
  assertEquals(findToken(goTok, src, "<-").type, "operator");
  assertEquals(findToken(goTok, src, "ch").type, "variable");
  assertEquals(findToken(goTok, src, "process").type, "function");
});

test("advanced: Go var func type", () => {
  const src = "var fn func(int, ...string) error";
  assertEquals(findToken(goTok, src, "var").type, "keyword");
  assertEquals(findToken(goTok, src, "fn").type, "variable");
  assertEquals(findToken(goTok, src, "func").type, "keyword");
  assertEquals(findToken(goTok, src, "int").type, "variable");
  assertEquals(findToken(goTok, src, "...").type, "operator");
  assertEquals(findToken(goTok, src, "string").type, "variable");
  assertEquals(findToken(goTok, src, "error").type, "variable");
});

test("advanced: Go map literal", () => {
  const src = 'm := map[string]int{"a": 1, "b": 2}';
  assertEquals(findToken(goTok, src, "m").type, "variable");
  assertEquals(findToken(goTok, src, "map").type, "keyword");
  assertEquals(findToken(goTok, src, "string").type, "variable");
  assertEquals(findToken(goTok, src, "int").type, "variable");
  assertEquals(findToken(goTok, src, '"a"').type, "string");
  assertEquals(findToken(goTok, src, '"b"').type, "string");
});

test("advanced: Go slice literal", () => {
  const src = "s := []int{1, 2, 3}";
  assertEquals(findToken(goTok, src, "s").type, "variable");
  assertEquals(findToken(goTok, src, "int").type, "variable");
  assertEquals(findToken(goTok, src, "1").type, "number");
  assertEquals(findToken(goTok, src, "2").type, "number");
  assertEquals(findToken(goTok, src, "3").type, "number");
});

test("advanced: Go goroutine", () => {
  const src = 'go func() { fmt.Println("async") }()';
  assertEquals(findToken(goTok, src, "go").type, "keyword");
  assertEquals(findToken(goTok, src, "func").type, "keyword");
  assertEquals(findToken(goTok, src, "fmt").type, "variable");
  assertEquals(findToken(goTok, src, "Println").type, "function");
});

// ================================================================
// Advanced: Rust advanced constructs
// ================================================================

test("advanced: Rust closure", () => {
  const src = "let closure = |x: i32| -> i32 { x * 2 };";
  assertEquals(findToken(rustTok, src, "let").type, "keyword");
  assertEquals(findToken(rustTok, src, "closure").type, "variable");
  assertEquals(findToken(rustTok, src, "|").type, "operator");
  assertEquals(findToken(rustTok, src, "x").type, "variable");
  assertEquals(findToken(rustTok, src, "i32").type, "variable");
  assertEquals(findToken(rustTok, src, "->").type, "operator");
});

test("advanced: Rust match expression", () => {
  const src = 'match result { Ok(v) => v, Err(e) => panic!("{}", e) }';
  assertEquals(findToken(rustTok, src, "match").type, "keyword");
  assertEquals(findToken(rustTok, src, "Ok").type, "function");
  assertEquals(findToken(rustTok, src, "Err").type, "function");
  assertEquals(findToken(rustTok, src, "panic").type, "variable");
  assertEquals(findToken(rustTok, src, "=>").type, "operator");
});

test("advanced: Rust if let", () => {
  const src = 'if let Some(x) = option { println!("{}", x); }';
  assertEquals(findToken(rustTok, src, "if").type, "control");
  assertEquals(findToken(rustTok, src, "let").type, "keyword");
  assertEquals(findToken(rustTok, src, "Some").type, "function");
  assertEquals(findToken(rustTok, src, "println").type, "variable");
});

test("advanced: Rust impl with generics", () => {
  const src =
    "impl<T: Display + Debug> fmt::Display for Wrapper<T> { fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result { Ok(()) } }";
  assertEquals(findToken(rustTok, src, "impl").type, "keyword");
  assertEquals(findToken(rustTok, src, "T").type, "constant");
  assertEquals(findToken(rustTok, src, "Display").type, "variable");
  assertEquals(findToken(rustTok, src, "Debug").type, "variable");
  assertEquals(findToken(rustTok, src, "for").type, "control");
  assertEquals(findToken(rustTok, src, "fn").type, "keyword");
  assertEquals(findToken(rustTok, src, "self").type, "keyword");
  assertEquals(findToken(rustTok, src, "mut").type, "keyword");
  assertEquals(findToken(rustTok, src, "Ok").type, "function");
});

test("advanced: Rust async fn", () => {
  const src = "async fn fetch() -> Result<Response, Error> { Ok(Response::new()) }";
  assertEquals(findToken(rustTok, src, "async").type, "keyword");
  assertEquals(findToken(rustTok, src, "fn").type, "keyword");
  assertEquals(findToken(rustTok, src, "Result").type, "variable");
  assertEquals(findToken(rustTok, src, "Response").type, "variable");
  assertEquals(findToken(rustTok, src, "Error").type, "variable");
  assertEquals(findToken(rustTok, src, "Ok").type, "function");
  assertEquals(findToken(rustTok, src, "new").type, "function");
});

test("advanced: Rust for range", () => {
  const src = 'for i in (0..5).rev() { println!("{}", i); }';
  assertEquals(findToken(rustTok, src, "for").type, "control");
  assertEquals(findToken(rustTok, src, "in").type, "keyword");
  assertEquals(findToken(rustTok, src, "rev").type, "function");
  assertEquals(findToken(rustTok, src, "println").type, "variable");
  assertEquals(findToken(rustTok, src, "i").type, "variable");
});

// ================================================================
// Advanced: JSON nested structures
// ================================================================

test("advanced: deeply nested JSON", () => {
  const src = '{"a": [{"b": [1, 2, 3]}, {"c": true}], "d": null}';
  assertEquals(findToken(jsonTok, src, '"a"').type, "key");
  assertEquals(findToken(jsonTok, src, '"b"').type, "key");
  assertEquals(findToken(jsonTok, src, '"c"').type, "key");
  assertEquals(findToken(jsonTok, src, '"d"').type, "key");
  assertEquals(findToken(jsonTok, src, "true").type, "boolean");
  assertEquals(findToken(jsonTok, src, "null").type, "null");
  assertEquals(findToken(jsonTok, src, "1").type, "number");
  assertEquals(findToken(jsonTok, src, "2").type, "number");
  assertEquals(findToken(jsonTok, src, "3").type, "number");
});

test("advanced: JSON escaped strings", () => {
  const src = '{"escaped": "line1\\nline2\\ttab"}';
  assertEquals(findToken(jsonTok, src, '"escaped"').type, "key");
  assertEquals(findToken(jsonTok, src, '"line1\\nline2\\ttab"').type, "string");
});

test("advanced: JSON unicode escapes", () => {
  const src = '{"unicode": "\\u0041\\u0042"}';
  assertEquals(findToken(jsonTok, src, '"unicode"').type, "key");
  assertEquals(findToken(jsonTok, src, '"\\u0041\\u0042"').type, "string");
});

test("advanced: JSON scientific notation", () => {
  const src = '{"big": 1e10, "small": 1.5e-3, "zero": 0}';
  assertEquals(findToken(jsonTok, src, "1e10").type, "number");
  assertEquals(findToken(jsonTok, src, "1.5e-3").type, "number");
  assertEquals(findToken(jsonTok, src, "0").type, "number");
});

// ================================================================
// Advanced: Whitespace and single-char tokens
// ================================================================

test("advanced: JS whitespace handling", () => {
  const tokens = whitespaceless(js, "a\n\n\nb");
  assertEquals(tokens.length, 2);
  assertEquals(tokens[0].type, "variable");
  assertEquals(tokens[0].end - tokens[0].start, 1);
  assertEquals(tokens[1].type, "variable");
  assertEquals(tokens[1].end - tokens[1].start, 1);
});

test("advanced: HTML whitespace", () => {
  const src = "  <div>  text  </div>  ";
  const tokens = whitespaceless(htmlTok, src);
  assertEquals(findToken(htmlTok, src, "div").type, "tag");
  const textTokens = tokens.filter((t) => t.type === "text");
  assertEquals(textTokens.length, 3);
  assertEquals(src.slice(textTokens[1].start, textTokens[1].end).includes("text"), true);
});

test("advanced: JS single-char tokens", () => {
  assertEquals(findToken(js, "(", "(").type, "punctuation");
  assertEquals(findToken(js, ")", ")").type, "punctuation");
  assertEquals(findToken(js, "{", "{").type, "punctuation");
  assertEquals(findToken(js, "}", "}").type, "punctuation");
  assertEquals(findToken(js, "[", "[").type, "punctuation");
  assertEquals(findToken(js, "]", "]").type, "punctuation");
  assertEquals(findToken(js, ";", ";").type, "punctuation");
  assertEquals(findToken(js, ",", ",").type, "punctuation");
  assertEquals(findToken(js, ".", ".").type, "punctuation");
  assertEquals(findToken(js, "?", "?").type, "operator");
  assertEquals(findToken(js, "!", "!").type, "operator");
});

// ================================================================
// Advanced: Massive nesting (26 levels deep)
// ================================================================

test("advanced: 26-level deep function call nesting", () => {
  const src = "f(g(h(i(j(k(l(m(n(o(p(q(r(s(t(u(v(w(x(y(z(zz))))))))))))))))))))))";
  const tokens = whitespaceless(js, src);
  const functions = tokens.filter((t) => t.type === "function");
  assertEquals(functions.length, 21); // deepest calls recognized as function
  assertEquals(findToken(js, src, "zz").type, "variable");
});

// ================================================================
// Advanced: Rust range tokenization bug
// ================================================================

test("advanced: Rust range (0..10)", () => {
  const src = "(0..10)";
  const _tokens = whitespaceless(rustTok, src);
  assertEquals(findToken(rustTok, src, "0").type, "number");
  assertEquals(findToken(rustTok, src, "..").type, "operator");
  assertEquals(findToken(rustTok, src, "10").type, "number");
});

test("advanced: Rust range (0..5).rev()", () => {
  const src = "(0..5).rev()";
  const _tokens = whitespaceless(rustTok, src);
  assertEquals(findToken(rustTok, src, "0").type, "number");
  assertEquals(findToken(rustTok, src, "..").type, "operator");
  assertEquals(findToken(rustTok, src, "5").type, "number");
  assertEquals(findToken(rustTok, src, "rev").type, "function");
});

// ================================================================
// Advanced: Cross-language range/double-dot operators
// ================================================================

test("advanced: Ruby range (1..10)", () => {
  const rubyTok = new UnifiedTokenizer(ruby);
  const src = "(1..10)";
  assertEquals(findToken(rubyTok, src, "1").type, "number");
  assertEquals(findToken(rubyTok, src, "..").type, "operator");
  assertEquals(findToken(rubyTok, src, "10").type, "number");
});

test("advanced: Ruby range (1...10) exclusive", () => {
  const rubyTok = new UnifiedTokenizer(ruby);
  const src = "(1...10)";
  assertEquals(findToken(rubyTok, src, "1").type, "number");
  assertEquals(findToken(rubyTok, src, "...").type, "operator");
  assertEquals(findToken(rubyTok, src, "10").type, "number");
});

test("advanced: Rust inclusive range (0..=10)", () => {
  const src = "(0..=10)";
  assertEquals(findToken(rustTok, src, "0").type, "number");
  assertEquals(findToken(rustTok, src, "..=").type, "operator");
  assertEquals(findToken(rustTok, src, "10").type, "number");
});
