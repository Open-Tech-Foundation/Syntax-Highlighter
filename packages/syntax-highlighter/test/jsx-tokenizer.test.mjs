import { assert, assertEquals, test } from "runtime:test";
import { createHighlighter, loadLanguage, validateTokens } from "../src/index.ts";

const jsx = await createHighlighter({ language: "jsx" });
const tsx = await createHighlighter({ language: "tsx" });
const js = await createHighlighter({ language: "javascript" });

/** `type:text` for every non-whitespace token, after checking the contract. */
function kinds(src, h = jsx) {
  const tokens = h.highlight(src);
  validateTokens(src, tokens);
  return tokens
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
}

function has(src, expected, h = jsx) {
  const actual = kinds(src, h);
  for (const e of expected) {
    if (!actual.includes(e)) throw new Error(`expected ${e} in ${JSON.stringify(actual)}`);
  }
}

test("elements: tags, attributes, strings, and text children", () => {
  assertEquals(kinds('const a = <div className="card">Hi</div>;'), [
    "keyword:const",
    "variable:a",
    "operator:=",
    "punctuation:<",
    "tag:div",
    "attribute:className",
    "operator:=",
    'string:"card"',
    "punctuation:>",
    "text:Hi",
    "punctuation:</",
    "tag:div",
    "punctuation:>",
    "punctuation:;",
  ]);
});

test("components and member expressions are classes; intrinsic tags are tags", () => {
  has("return <ui.Box><Card/><svg:rect/><my-el/></ui.Box>;", [
    "class:ui.Box",
    "class:Card",
    "tag:svg:rect",
    "tag:my-el",
  ]);
});

test("expression containers hold code, including nested JSX", () => {
  has("f(<li onClick={() => go(<b>x</b>)}>{count + 1}</li>)", [
    "attribute:onClick",
    "operator:=>",
    "function:go",
    "tag:b",
    "text:x",
    "variable:count",
    "number:1",
  ]);
});

test("spread attributes, fragments, and self-closing tags", () => {
  has("x = <><Input {...props} disabled /></>;", [
    "class:Input",
    "operator:...",
    "variable:props",
    "attribute:disabled",
    "punctuation:/>",
  ]);
});

test("attribute strings may span lines and contain backslashes", () => {
  has('x = <a title="line1\nline2 \\d" />;', ['string:"line1\nline2 \\d"']);
});

test("comparisons and shifts are not JSX", () => {
  const out = kinds("if (a < b && c > d) x = y << 2;");
  assert(!out.some((k) => k.startsWith("tag:")), JSON.stringify(out));
});

test("TSX: generic arrows `<T,>` and `<T extends U>` are not JSX", () => {
  for (const src of ["const f = <T,>(x: T) => x;", "const g = <T extends object>(x: T) => x;"]) {
    const out = kinds(src, tsx);
    assert(!out.some((k) => k.startsWith("tag:")), `${src}: ${JSON.stringify(out)}`);
  }
});

test("TSX: types and JSX in one component", () => {
  has(
    "export function Card({ title }: Props): JSX.Element { return <h1>{title}</h1>; }",
    ["keyword:export", "function:Card", "tag:h1"],
    tsx,
  );
});

test("plain JavaScript does not scan JSX", () => {
  const out = kinds("return <div/>;", js);
  assert(!out.some((k) => k.startsWith("tag:")), JSON.stringify(out));
});

test("regex literals still work in expression position", () => {
  has("const r = /<div>/g;", ["regex:/<div>/g"]);
});

test("unterminated JSX still satisfies the token contract", () => {
  for (const src of ["<div", "<div a=", '<div a="x', "<div>{", "<div>text", "<a><b></a", "</"]) {
    kinds(`x = ${src}`);
  }
});

test("hostile nesting neither overflows the stack nor breaks the contract", () => {
  kinds(`x = ${"<a>".repeat(10000)}`);
  kinds(`x = ${"<a>{".repeat(5000)}`);
});

test("tsx is its own language, no longer a TypeScript alias", async () => {
  assertEquals((await loadLanguage("tsx")).name, "tsx");
  assertEquals((await loadLanguage("ts")).name, "typescript");
});
