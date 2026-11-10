import { assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { validateTokens } from "../src/core/json-renderer.ts";
import yaml from "../src/languages/yaml.ts";

const highlighter = new Highlighter(yaml);

/** `type:text` per line, whitespace dropped, after checking the contract. */
function lines(src) {
  const tokens = highlighter.highlight(src);
  validateTokens(src, tokens);
  const out = [[]];
  for (const t of tokens) {
    const text = src.slice(t.start, t.end);
    if (t.type === "whitespace") {
      for (let i = 0; i < (text.match(/\n/g) ?? []).length; i++) out.push([]);
      continue;
    }
    out[out.length - 1].push(`${t.type}:${text}`);
  }
  return out;
}

test("mapping keys are properties; plain values are strings", () => {
  assertEquals(lines("runs-on: ubuntu-latest\nname: Build and test"), [
    [
      "property:runs",
      "property:-",
      "property:on",
      "operator::",
      "string:ubuntu",
      "string:-",
      "string:latest",
    ],
    ["property:name", "operator::", "string:Build", "string:and", "string:test"],
  ]);
});

test("YAML 1.2 scalars: booleans, null, numbers; yes/no/on are strings", () => {
  assertEquals(lines("a: true\nb: ~\nc: null\nd: 3.5\ne: -1\nf: 0x1F\ng: .inf\nh: yes\ni: off"), [
    ["property:a", "operator::", "boolean:true"],
    ["property:b", "operator::", "null:~"],
    ["property:c", "operator::", "null:null"],
    ["property:d", "operator::", "number:3.5"],
    ["property:e", "operator::", "number:-", "number:1"],
    ["property:f", "operator::", "number:0x1F"],
    ["property:g", "operator::", "number:.", "number:inf"],
    ["property:h", "operator::", "string:yes"],
    ["property:i", "operator::", "string:off"],
  ]);
});

test("`on:` and other boolean-looking words are keys when followed by a colon", () => {
  assertEquals(lines("on:\n  push:")[0], ["property:on", "operator::"]);
});

test("sequences: items, nested entries, and mappings inside items", () => {
  assertEquals(lines("- main\n- - nested\n- uses: actions/checkout@v4"), [
    ["operator:-", "string:main"],
    ["operator:-", "operator:-", "string:nested"],
    [
      "operator:-",
      "property:uses",
      "operator::",
      "string:actions",
      "string:/",
      "string:checkout",
      "string:@v4",
    ],
  ]);
});

test("quoted values and keys keep their string type", () => {
  assertEquals(lines('"quoted key": \'single\'\nk: "a: b # not a comment"'), [
    ['string:"quoted key"', "operator::", "string:'single'"],
    ["property:k", "operator::", 'string:"a: b # not a comment"'],
  ]);
});

test("a trailing comment ends the value", () => {
  assertEquals(lines("k: v # note"), [["property:k", "operator::", "string:v", "comment:# note"]]);
});

test("block scalars: indicator is a keyword, the indented body a string", () => {
  assertEquals(lines("run: |\n  npm ci\n  npm test\nnext: x"), [
    ["property:run", "operator::", "keyword:|"],
    ["string:npm", "string:ci"],
    ["string:npm", "string:test"],
    ["property:next", "operator::", "string:x"],
  ]);
  assertEquals(lines("fold: >-\n  text: not a key\nnext: x")[1], [
    "string:text",
    "string::",
    "string:not",
    "string:a",
    "string:key",
  ]);
});

test("anchors, aliases, tags, and the merge key", () => {
  assertEquals(
    lines("base: &defaults\n  a: 1\nuse:\n  <<: *defaults\nref: !Ref Bucket\n- &item name: x"),
    [
      ["property:base", "operator::", "keyword:&", "class:defaults"],
      ["property:a", "operator::", "number:1"],
      ["property:use", "operator::"],
      ["constant:<", "constant:<", "operator::", "keyword:*", "variable:defaults"],
      ["property:ref", "operator::", "keyword:!", "keyword:Ref", "string:Bucket"],
      ["operator:-", "keyword:&", "class:item", "property:name", "operator::", "string:x"],
    ],
  );
});

test("flow collections, including ones wrapped across lines", () => {
  assertEquals(lines("tags: [a, 'b', {k: 2}]\nlist: [x,\n  y]\nafter: z"), [
    [
      "property:tags",
      "operator::",
      "punctuation:[",
      "string:a",
      "punctuation:,",
      "string:'b'",
      "punctuation:,",
      "punctuation:{",
      "property:k",
      "operator::",
      "number:2",
      "punctuation:}",
      "punctuation:]",
    ],
    ["property:list", "operator::", "punctuation:[", "string:x", "punctuation:,"],
    ["string:y", "punctuation:]"],
    ["property:after", "operator::", "string:z"],
  ]);
});

test("template expressions inside plain values stay part of the string", () => {
  const [line] = lines("if: ${{ github.ref }}");
  for (const part of line.slice(2)) {
    if (!part.startsWith("string:")) throw new Error(`expected string, got ${part}`);
  }
});

test("document markers and directives are left alone", () => {
  const out = lines("%YAML 1.2\n---\na: 1\n...");
  assertEquals(out[2], ["property:a", "operator::", "number:1"]);
});

test("malformed input still satisfies the token contract", () => {
  for (const src of ["a: [b, c", "a: {b: ", "- |", "k: 'open", ": x", "&a", "a: *"]) lines(src);
});
