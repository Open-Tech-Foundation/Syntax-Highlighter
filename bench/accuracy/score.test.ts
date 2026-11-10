import { assert, assertEquals, test } from "runtime:test";
import { createHighlighter as createShiki } from "shiki";
import { createHighlighter } from "../../packages/syntax-highlighter/src/index.ts";
import {
  addScore,
  classesFromSpans,
  classesFromTokens,
  classifyScopes,
  classifyToken,
  compare,
  emptyScore,
  percentages,
  spansFromShiki,
} from "./score.ts";

const js = (...inner: string[]) => ["source.js", ...inner];

test("delimiters take the class of what they delimit", () => {
  assertEquals(
    classifyScopes(js("string.quoted.double.js", "punctuation.definition.string.begin.js"), '"'),
    "string",
  );
  assertEquals(
    classifyScopes(
      [
        "source.json",
        "meta.structure.dictionary.json",
        "support.type.property-name.json",
        "punctuation.support.type.property-name.begin.json",
      ],
      '"',
    ),
    "property",
  );
  assertEquals(
    classifyScopes(js("comment.line.double-slash.js", "punctuation.definition.comment.js"), "//"),
    "comment",
  );
});

test("interpolations are plain inside strings; escapes stay string", () => {
  const tpl = js("string.template.js", "meta.template.expression.js");
  assertEquals(
    classifyScopes([...tpl, "punctuation.definition.template-expression.begin.js"], "${"),
    "plain",
  );
  assertEquals(
    classifyScopes([...tpl, "meta.embedded.line.js", "variable.other.readwrite.js"], "x"),
    "plain",
  );
  assertEquals(
    classifyScopes(js("string.quoted.double.js", "constant.character.escape.js"), "\\n"),
    "string",
  );
});

test("everything inside a comment is comment, including doc tags", () => {
  assertEquals(
    classifyScopes(js("comment.block.documentation.js", "storage.type.class.jsdoc"), "@param"),
    "comment",
  );
});

test("word operators are keywords, symbol operators are plain", () => {
  assertEquals(classifyScopes(js("keyword.operator.new.js"), "new"), "keyword");
  assertEquals(classifyScopes(js("keyword.operator.arithmetic.js"), "+"), "plain");
  assertEquals(classifyScopes(js("storage.type.js"), "const"), "keyword");
  assertEquals(classifyScopes(js("variable.language.this.js"), "this"), "keyword");
});

test("constant bindings are plain unless ALL_CAPS", () => {
  assertEquals(classifyScopes(js("variable.other.constant.js"), "s"), "plain");
  assertEquals(classifyScopes(js("variable.other.constant.js"), "MAX_SIZE"), "constant");
  assertEquals(classifyScopes(js("constant.language.boolean.true.js"), "true"), "constant");
});

test("calls, types, properties, and markup map to their classes", () => {
  assertEquals(
    classifyScopes(["source.python", "meta.function-call.generic.python"], "f"),
    "function",
  );
  assertEquals(classifyScopes(js("entity.name.type.class.js"), "Foo"), "type");
  assertEquals(
    classifyScopes(["source.css", "support.type.property-name.css"], "color"),
    "property",
  );
  assertEquals(classifyScopes(["source.yaml", "entity.name.tag.yaml"], "name"), "property");
  assertEquals(classifyScopes(["source.diff", "markup.inserted.diff"], "+a"), "inserted");
  assertEquals(classifyScopes(["text.html.markdown", "markup.heading.markdown"], "# H"), "heading");
});

test("units count as their number; vendored property names are properties", () => {
  assertEquals(
    classifyScopes(["source.css", "constant.numeric.css", "keyword.other.unit.rem.css"], "rem"),
    "number",
  );
  assertEquals(
    classifyScopes(["source.css", "support.type.vendored.property-name.css"], "-webkit-appearance"),
    "property",
  );
});

test("structural and unknown scopes defer to plain", () => {
  assertEquals(classifyScopes(js("meta.var.expr.js"), "x"), "plain");
  assertEquals(classifyScopes(js("punctuation.terminator.statement.js"), ";"), "plain");
  assertEquals(classifyScopes([], "x"), "plain");
});

test("our tokens: semantic identity wins over type", () => {
  assertEquals(classifyToken({ type: "keyword", semantic: "markup.heading" }), "heading");
  assertEquals(classifyToken({ type: "text", semantic: "code.inline" }), "string");
  assertEquals(classifyToken({ type: "control" }), "keyword");
  assertEquals(classifyToken({ type: "boolean" }), "constant");
  assertEquals(classifyToken({ type: "variable" }), "plain");
  assertEquals(classifyToken({ type: "whitespace" }), "plain");
});

test("compare scores non-whitespace characters and groups mismatch runs", () => {
  const source = "ab cd";
  const reference = classesFromSpans(5, [
    { start: 0, text: "ab", scopes: ["keyword.control"] },
    { start: 3, text: "cd", scopes: ["string.quoted"] },
  ]);
  const ours = classesFromTokens(5, [
    { type: "keyword", start: 0, end: 2 },
    { type: "whitespace", start: 2, end: 3 },
    { type: "variable", start: 3, end: 5 },
  ]);
  const score = compare(source, reference, ours);
  assertEquals(score.chars, 4);
  assertEquals(score.matched, 2);
  assertEquals(score.highlighted, 4);
  assertEquals(score.highlightedMatched, 2);
  assertEquals(score.confusion.get("string→plain"), { chars: 2, examples: ["cd"] });
  assertEquals(percentages(score), { overall: 50, highlighted: 50 });
});

test("plain-on-both characters count toward overall but not highlighted", () => {
  const score = compare("x;", ["plain", "plain"], ["plain", "plain"]);
  assertEquals([score.chars, score.matched, score.highlighted], [2, 2, 0]);
  assertEquals(percentages(score), { overall: 100, highlighted: 100 });
});

test("addScore accumulates counts and confusion", () => {
  const a = compare("a", ["string"], ["plain"]);
  const b = compare("b", ["string"], ["plain"]);
  const total = addScore(addScore(emptyScore(), a), b);
  assertEquals(total.chars, 2);
  assertEquals(total.confusion.get("string→plain"), { chars: 2, examples: ["a", "b"] });
});

test("end to end: real Shiki and our highlighter agree on a simple statement", async () => {
  const source = 'const s = "hi"; // note';
  const shiki = await createShiki({ themes: ["github-dark"], langs: ["javascript"] });
  const result = shiki.codeToTokens(source, {
    lang: "javascript",
    theme: "github-dark",
    includeExplanation: true,
  });
  const spans = spansFromShiki(result);
  assertEquals(spans.map((s) => s.text).join(""), source);
  const ours = await createHighlighter({ language: "javascript" });
  const score = compare(
    source,
    classesFromSpans(source.length, spans),
    classesFromTokens(source.length, ours.highlight(source)),
  );
  assert(score.chars > 0);
  assertEquals(percentages(score).overall, 100, JSON.stringify([...score.confusion]));
});
