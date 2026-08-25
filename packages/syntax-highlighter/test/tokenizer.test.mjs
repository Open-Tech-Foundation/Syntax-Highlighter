import { assert, assertEquals, test } from "runtime:test";
import { Lexer } from "../src/core/lexer.ts";
import { UnifiedTokenizer as Tokenizer } from "../src/core/unified-tokenizer.ts";
import javascript from "../src/languages/javascript.ts";

const tokenizer = new Tokenizer(javascript);

function tokens(source) {
  return tokenizer.tokenize(source).filter((t) => t.type !== "whitespace");
}

function kinds(source) {
  return tokens(source).map((t) => `${t.type}:${source.slice(t.start, t.end)}`);
}

function types(source) {
  return tokens(source).map((t) => t.type);
}

function findToken(source, text, occurrence = 0) {
  const all = tokens(source);
  let seen = 0;
  for (const t of all) {
    if (source.slice(t.start, t.end) === text) {
      if (seen++ === occurrence) return t;
    }
  }
  return null;
}

test("token shape is exactly {type,start,end}", () => {
  const [tok] = tokens("const");
  assertEquals(Object.keys(tok).sort(), ["end", "start", "type"]);
});

test("keywords, booleans and null", () => {
  assertEquals(kinds("const x = true;"), [
    "keyword:const",
    "variable:x",
    "operator:=",
    "boolean:true",
    "punctuation:;",
  ]);
  assertEquals(findToken("return null;", "null").type, "null");
});

test("function declaration, parameters and call sites", () => {
  const src = 'function greet(name) { return name; } greet("hi");';
  assertEquals(findToken(src, "greet", 0).type, "function");
  assertEquals(findToken(src, "name", 0).type, "parameter");
  assertEquals(findToken(src, "name", 1).type, "parameter");
  assertEquals(findToken(src, "greet", 1).type, "function");
  assertEquals(findToken(src, '"hi"').type, "string");
});

test("class declaration, extends, methods and constructor call", () => {
  const src = `
    class Point extends Base {
      move(x) { return x; }
    }
    const p = new Point(1);
    p.move(2);
  `;
  assertEquals(findToken(src, "Point", 0).type, "class");
  assertEquals(findToken(src, "Base").type, "class");
  assertEquals(findToken(src, "move", 0).type, "function");
  assertEquals(findToken(src, "x", 0).type, "parameter");
  assertEquals(findToken(src, "Point", 1).type, "class");
  assertEquals(findToken(src, "move", 1).type, "property");
});

test("property access after dot and optional chaining", () => {
  assertEquals(kinds("obj.foo.bar()"), [
    "variable:obj",
    "punctuation:.",
    "property:foo",
    "punctuation:.",
    "property:bar",
    "punctuation:(",
    "punctuation:)",
  ]);
  assertEquals(findToken("a?.b", "b").type, "property");
});

test("object keys vs shorthand methods", () => {
  const src = "const o = { a: 1, b() { return 2; } };";
  assertEquals(findToken(src, "a").type, "property");
  assertEquals(findToken(src, "b").type, "function");
});

test("template literals with nested expressions", () => {
  const src = "`a${ x }b${ `c${ y }` }d`";
  assertEquals(types(src), [
    "string", // `a${          outer chunk up to ${
    "punctuation", // ${
    "variable", // x
    "punctuation", // }             closes outer expression
    "string", // b             outer chunk up to ${
    "punctuation", // ${
    "string", // `c${          inner template chunk
    "punctuation", // ${
    "variable", // y
    "punctuation", // }             closes inner expression
    "string", // `             inner template closing backtick
    "punctuation", // }             closes outer expression
    "string", // d`            final chunk incl. closing backtick
  ]);
});

test("regex vs division disambiguation", () => {
  assertEquals(findToken("return /ab+c/gi;", "/ab+c/gi").type, "regex");
  assertEquals(findToken("const re = /x[0/9]/;", "/x[0/9]/").type, "regex");
  const div = kinds("const half = total / 2;");
  assert(div.includes("operator:/"));
  assert(!div.some((k) => k.startsWith("regex")));
});

test("multiline block comment is one token spanning lines", () => {
  const src = "/* one\ntwo\nthree */\nlet ok;";
  const comment = findToken(src, src.slice(0, src.indexOf("\nlet")));
  assertEquals(comment.type, "comment");
  assertEquals(comment.start, 0);
  assert(src.slice(comment.start, comment.end).includes("\n"));
});

test("line comments stop at newline", () => {
  const src = "// note\nlet a;";
  const comment = findToken(src, "// note");
  assertEquals(comment.type, "comment");
  assertEquals(comment.end, src.indexOf("\n"));
});

test("number variants", () => {
  const src = "0xFF 0b1010 0o17 1_000 1.5e-3 10n .5";
  const nums = tokens(src)
    .filter((t) => t.type === "number")
    .map((t) => src.slice(t.start, t.end));
  assertEquals(nums, ["0xFF", "0b1010", "0o17", "1_000", "1.5e-3", "10n", ".5"]);
});

test("arrow function parameters are retro-classified", () => {
  const src = "const f = x => x + offset;";
  assertEquals(findToken(src, "x", 0).type, "parameter");
  assertEquals(findToken(src, "x", 1).type, "parameter");
  assertEquals(findToken(src, "offset").type, "variable");
});

test("parameters stay in scope inside nested blocks", () => {
  const src = "function f(a) { if (a) { return a; } }";
  assertEquals(findToken(src, "a", 0).type, "parameter");
  assertEquals(findToken(src, "a", 1).type, "parameter");
  assertEquals(findToken(src, "a", 2).type, "parameter");
});

test("UPPER_CASE identifiers become constants", () => {
  assertEquals(findToken("const MAX_RETRIES = 3;", "MAX_RETRIES").type, "constant");
});

test("import statement classification", () => {
  const src = 'import { Widget, mount } from "./widget.js";';
  assertEquals(findToken(src, "Widget").type, "variable");
  assertEquals(findToken(src, "mount").type, "variable");
  assertEquals(findToken(src, '"./widget.js"').type, "string");
});

test("offsets are exact", () => {
  const src = "const hello = 42;";
  const tok = findToken(src, "hello");
  assertEquals(tok.start, 6);
  assertEquals(tok.end, 11);
  assertEquals(src.slice(tok.start, tok.end), "hello");
});

test("code after a template literal is not swallowed by it", () => {
  // A template chunk used to stay on the scan stack after handing control to
  // its `${...}`, so the abandoned frame re-scanned everything that followed
  // as one unterminated string.
  const src = "const a = `x${ y }z`;\nconst b = 1;";
  assertEquals(findToken(src, "b").type, "variable");
  assertEquals(findToken(src, "1").type, "number");
  assertEquals(
    types(src).filter((t) => t === "string").length,
    2,
    "one chunk before the hole and one after",
  );
});

test("deeply nested template interpolation does not overflow", () => {
  const src = `\`${"${`".repeat(500)}x${"`}".repeat(500)}\``;
  const all = tokenizer.tokenize(src);
  let pos = 0;
  for (const t of all) {
    assertEquals(t.start, pos);
    pos = t.end;
  }
  assertEquals(pos, src.length);
});

test("comments are transparent to lookahead", () => {
  assertEquals(findToken("greet /* who */ ()", "greet").type, "function");
  assertEquals(findToken("function f() /* body */ { return 1; }", "f").type, "function");
  const src = "const o = { a /* key */ : 1 };";
  assertEquals(findToken(src, "a").type, "property");
});

test("tokens cover the whole source contiguously", () => {
  const src = "const a=1;/*c*/let b=`t${b}s`;// x\n";
  const all = tokenizer.tokenize(src);
  let pos = 0;
  for (const t of all) {
    assertEquals(t.start, pos);
    pos = t.end;
  }
  assertEquals(pos, src.length);
});

test("decorators are recognized", () => {
  assertEquals(findToken("@Component class A {}", "@Component").type, "decorator");
});

test("call arguments are not mistaken for parameter names", () => {
  const src = "widget.render(target); log(count);";
  assertEquals(findToken(src, "target").type, "variable");
  assertEquals(findToken(src, "count").type, "variable");
});

test("destructured parameters and aliases are classified", () => {
  const src = "function f({a, b: c = 1, ...rest}, [x]) { return a + c + rest.x + x; }";
  assertEquals(findToken(src, "a", 0).type, "parameter");
  assertEquals(findToken(src, "b").type, "property");
  assertEquals(findToken(src, "c", 0).type, "parameter");
  assertEquals(findToken(src, "rest", 0).type, "parameter");
  assertEquals(findToken(src, "x", 0).type, "parameter");
  assertEquals(findToken(src, "a", 1).type, "parameter");
  assertEquals(findToken(src, "c", 1).type, "parameter");
  assertEquals(findToken(src, "rest", 1).type, "parameter");
  assertEquals(findToken(src, "x", 1).type, "property");
  assertEquals(findToken(src, "x", 2).type, "parameter");
});

test("arrow functions with destructured parameters are classified", () => {
  const src = "const f = ({value: v}, [first]) => v + first;";
  assertEquals(findToken(src, "value").type, "property");
  assertEquals(findToken(src, "v", 0).type, "parameter");
  assertEquals(findToken(src, "first", 0).type, "parameter");
  assertEquals(findToken(src, "v", 1).type, "parameter");
  assertEquals(findToken(src, "first", 1).type, "parameter");
});

test("regex literals can follow control headers", () => {
  assertEquals(findToken("if (ready) /re/.test(value);", "/re/").type, "regex");
});

test("private fields are treated as properties", () => {
  const src = "class Counter { #count = 0; read() { return this.#count; } }";
  assertEquals(findToken(src, "count", 0).type, "property");
  assertEquals(findToken(src, "count", 1).type, "property");
});

test("custom string escape delimiters are honored", () => {
  const lexer = new Lexer({
    lex: { strings: [{ open: "'", close: "'", escape: "%" }] },
  });
  const source = "'left%'right'";
  const [token] = lexer.tokenize(source);
  assertEquals(token.type, "string");
  assertEquals(token.end, source.length);
});

test("unicode identifiers are scanned as complete code points", () => {
  const src = "const 𝒜 = 1; 𝒜;";
  assertEquals(findToken(src, "𝒜", 0).type, "variable");
  assertEquals(findToken(src, "𝒜", 1).type, "variable");
});

test("multi-parameter arrow functions", () => {
  const src = "const ratio = (a, b) => a / b;";
  assertEquals(findToken(src, "a", 0).type, "parameter");
  assertEquals(findToken(src, "b", 0).type, "parameter");
  assertEquals(findToken(src, "a", 1).type, "parameter");
  assertEquals(findToken(src, "b", 1).type, "parameter");
});

test("control headers do not bind parameters", () => {
  const src = "if (count) { count = 0; }";
  assertEquals(findToken(src, "count", 0).type, "variable");
  assertEquals(findToken(src, "count", 1).type, "variable");
});

test("catch binds its error parameter", () => {
  const src = "try { run(); } catch (err) { warn(err); }";
  assertEquals(findToken(src, "err", 0).type, "parameter");
  assertEquals(findToken(src, "err", 1).type, "parameter");
});

test("unterminated constructs do not crash", () => {
  const toks = tokens('const s = "abc\n/* never closed');
  assert(toks.length > 0);
});

test("astral characters stay whole in the unknown-char fallback", () => {
  const src = "const 🎉 = 1;";
  for (const t of tokenizer.tokenize(src)) {
    const text = src.slice(t.start, t.end);
    assert(
      !/[\uD800-\uDBFF](?:[^\uDC00-\uDFFF]|$)|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text),
      `token ${JSON.stringify(t)} splits a surrogate pair: ${JSON.stringify(text)}`,
    );
  }
});
