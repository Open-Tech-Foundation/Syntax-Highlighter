import { assert, assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import typescript from "../src/languages/typescript.ts";

const highlighter = new Highlighter(typescript);

function kinds(src) {
  return highlighter
    .highlight(src)
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
}

function typeAt(src, text) {
  const tok = highlighter
    .highlight(src)
    .find((t) => t.type !== "whitespace" && src.slice(t.start, t.end) === text);
  assert(tok, `expected a token for ${JSON.stringify(text)} in ${JSON.stringify(src)}`);
  return tok.type;
}

test("type alias name is class and members are properties", () => {
  const src = "type Result<T> = { ok: true; value: T };";
  const k = kinds(src);
  assert(k.includes("keyword:type"));
  assert(k.includes("class:Result"), k.join(" "));
  assert(k.includes("property:ok"), k.join(" "));
  assert(k.includes("property:value"), k.join(" "));
});

test("interface name is class and members are properties", () => {
  const src = "interface Opts { port: number }";
  const k = kinds(src);
  assert(k.includes("keyword:interface"));
  assert(k.includes("class:Opts"), k.join(" "));
  assert(k.includes("property:port"), k.join(" "));
});

test("enum name is class", () => {
  assertEquals(typeAt("enum Color { Red, Green }", "Color"), "class");
});

test("contextual `type` as property value stays plain", () => {
  // `{ type: x }` — x follows the keyword `type` but is not `=`/`<`
  assertEquals(typeAt("const o = { type: x };", "x"), "variable");
});

test("typed arrow parameters bind as parameter", () => {
  const src = "const greet = (name: string): string => name;";
  assertEquals(typeAt(src, "name"), "parameter");
});

test("optional annotated parameter binds; generic annotation is not swallowed", () => {
  const src = "const f = (a?: number, m: Map<string, number>) => a;";
  assertEquals(typeAt(src, "a"), "parameter");
  assertEquals(typeAt(src, "m"), "parameter");
  // `number` after the nested-generic comma must not be bound as a parameter
  assert(!kinds(src).includes("parameter:number"), kinds(src).join(" "));
});

test("generic function declaration binds params and names the function", () => {
  const src = "function identity<T>(arg: T): T { return arg; }";
  assertEquals(typeAt(src, "identity"), "function");
  assertEquals(typeAt(src, "arg"), "parameter");
});

test("generic method declaration binds params", () => {
  const src = "class Box<T> { get(inner: T): T { return inner; } }";
  assertEquals(typeAt(src, "Box"), "class");
  assertEquals(typeAt(src, "inner"), "parameter");
});

test("return annotation does not break method param binding", () => {
  const src = "class P { move(x: number): number { return x; } }";
  assertEquals(typeAt(src, "x"), "parameter");
});

test("plain JavaScript still highlights through the TS definition", () => {
  const src = "const x = 42;";
  const k = kinds(src);
  assert(k.includes("keyword:const"));
  assert(k.includes("variable:x"));
  assert(k.includes("number:42"));
});
