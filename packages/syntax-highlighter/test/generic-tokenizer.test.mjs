import { assert, assertEquals, test } from "runtime:test";
import { GenericTokenizer } from "../src/core/generic-tokenizer.ts";
import { Highlighter } from "../src/core/highlighter.ts";
import { Tokenizer } from "../src/core/tokenizer.ts";
import sql from "../src/languages/sql.ts";
import javascript from "../src/languages/javascript.ts";

// Deliberately expressible as JSON — this is the shape a user pastes into
// registerLanguage(), so the tests exercise the path custom languages take.
const minilang = {
  name: "minilang",
  keywords: ["let", "if", "else", "class", "function"],
  booleans: ["yes", "no"],
  nulls: ["nil"],
  constants: ["PI"],
  operators: ["?.", "->", "=", "+"],
  punctuation: ["(", ")", "{", "}", "[", "]", ".", ",", ";"],
  lex: {
    strings: [{ open: '"', close: '"', escape: "\\" }],
    comments: [
      { open: "#", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
  },
};

const tokenizer = new GenericTokenizer(minilang);

function tokens(source) {
  return tokenizer.tokenize(source).filter((t) => t.type !== "whitespace");
}

function kinds(source) {
  return tokens(source).map((t) => `${t.type}:${source.slice(t.start, t.end)}`);
}

function typeOf(source, text) {
  return tokens(source).find((t) => source.slice(t.start, t.end) === text)?.type;
}

test("the definition's own word lists drive classification", () => {
  assertEquals(kinds("let ok = yes;"), [
    "keyword:let",
    "variable:ok",
    "operator:=",
    "boolean:yes",
    "punctuation:;",
  ]);
  assertEquals(typeOf("x = nil", "nil"), "null");
  assertEquals(typeOf("x = PI", "PI"), "constant");
});

test("SCREAMING_CASE reads as a constant without being listed", () => {
  assertEquals(typeOf("let MAX_SIZE = 1;", "MAX_SIZE"), "constant");
});

test("an identifier before ( is a function, after . is a property", () => {
  assertEquals(typeOf("frob(1)", "frob"), "function");
  assertEquals(typeOf("a.b", "b"), "property");
  assertEquals(typeOf("a?.b", "b"), "property");
});

test("a comment between an identifier and its ( is transparent", () => {
  assertEquals(typeOf("frob /* why */ (1)", "frob"), "function");
  assertEquals(typeOf("a /* why */ .b", "b"), "property");
});

test("member access does not leak past the token it applies to", () => {
  // `.` binds to the very next significant token. `1` is not an identifier,
  // so `later` must not inherit the pending property expectation.
  assertEquals(typeOf("obj. 1 later", "later"), "variable");
  assertEquals(typeOf('obj. "s" later', "later"), "variable");
});

test("numbers, strings and comments are classified", () => {
  assertEquals(kinds('let s = "hi"; # note\n'), [
    "keyword:let",
    "variable:s",
    "operator:=",
    'string:"hi"',
    "punctuation:;",
    "comment:# note",
  ]);
  assertEquals(typeOf("x = 1_000.5e-3", "1_000.5e-3"), "number");
  assertEquals(typeOf("/* block */", "/* block */"), "comment");
});

test("no JavaScript semantics are applied to a generic language", () => {
  // `class` and `function` are keywords here only because minilang lists
  // them; the names after them must stay plain, not become class/function
  // declarations, and `->` must not bind parameters the way `=>` does.
  assertEquals(typeOf("class Thing {}", "Thing"), "variable");
  assertEquals(typeOf("function make {}", "make"), "variable");
  assertEquals(typeOf("(a) -> a", "a"), "variable");
});

test("tokens cover the whole source contiguously", () => {
  const source = 'let a = 1; # c\nfrob("s", a.b);\n';
  let pos = 0;
  for (const token of tokenizer.tokenize(source)) {
    assertEquals(token.start, pos);
    pos = token.end;
  }
  assertEquals(pos, source.length);
});

test("Highlighter dispatches on the semantic field", () => {
  assert(new Highlighter(javascript).tokenizer instanceof Tokenizer);
  assert(new Highlighter(minilang).tokenizer instanceof GenericTokenizer);
  assert(
    new Highlighter({ ...minilang, semantic: "generic" }).tokenizer instanceof GenericTokenizer,
  );
});

test("caseInsensitive languages match keywords in any case (SQL)", () => {
  const src = "SELECT id FROM users WHERE active = TRUE AND name IS NOT NULL";
  const toks = new GenericTokenizer(sql).tokenize(src);
  const kinds = toks.map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
  for (const word of ["SELECT", "FROM", "WHERE", "AND", "IS", "NOT"]) {
    assert(kinds.includes(`keyword:${word}`), `expected keyword:${word} in ${JSON.stringify(kinds)}`);
  }
  assert(kinds.includes("boolean:TRUE"));
  assert(kinds.includes("null:NULL"));
});

test("case-sensitive languages keep exact matching (minilang)", () => {
  const src = "let If = 1;";
  const toks = new GenericTokenizer(minilang).tokenize(src);
  const kinds = toks.map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
  assert(!kinds.some((k) => k.startsWith("keyword:If")), `unexpected keyword match: ${JSON.stringify(kinds)}`);
});
