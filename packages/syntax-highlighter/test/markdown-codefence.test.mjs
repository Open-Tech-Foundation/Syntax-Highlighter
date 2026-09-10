import { assert, test } from "runtime:test";
import { renderHTML } from "../src/core/html-renderer.ts";
import { renderJSON } from "../src/core/json-renderer.ts";
import { UnifiedTokenizer } from "../src/core/unified-tokenizer.ts";
import javascript from "../src/languages/javascript.ts";
import markdown from "../src/languages/markdown.ts";
import typescript from "../src/languages/typescript.ts";

function kinds(tok, src) {
  return tok
    .tokenize(src)
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
}

const mdWithEmbed = {
  ...markdown,
  lex: {
    ...markdown.lex,
    codeFences: [
      {
        open: "```",
        close: "```",
        embed: { javascript, js: javascript, typescript, ts: typescript },
      },
    ],
  },
};

const tok = new UnifiedTokenizer(mdWithEmbed);

test("markdown: headings use linePrefixes", () => {
  const src = "# Heading 1\n## Heading 2\n### Heading 3";
  const k = kinds(tok, src);
  assert(k.includes("keyword:# Heading 1"), `expected keyword for h1, got ${k}`);
  assert(k.includes("keyword:## Heading 2"), `expected keyword for h2, got ${k}`);
  assert(k.includes("keyword:### Heading 3"), `expected keyword for h3, got ${k}`);
});

test("markdown: blockquotes", () => {
  const src = "> blockquote text";
  const k = kinds(tok, src);
  assert(
    k.some((x) => x.startsWith("comment:")),
    `expected comment for blockquote, got ${k}`,
  );
});

test("markdown: code fence with JS highlighting", () => {
  const src = "```javascript\nfunction greet(name) {\n  return true;\n}\n```";
  const k = kinds(tok, src);
  // The code inside should be highlighted as JS
  assert(
    k.some((x) => x === "function:greet"),
    `expected function:greet, got ${k}`,
  );
  assert(
    k.some((x) => x === "keyword:function"),
    `expected keyword:function, got ${k}`,
  );
  assert(
    k.some((x) => x === "parameter:name"),
    `expected parameter:name, got ${k}`,
  );
  assert(
    k.some((x) => x === "control:return"),
    `expected control:return, got ${k}`,
  );
  assert(
    k.some((x) => x === "boolean:true"),
    `expected boolean:true, got ${k}`,
  );
});

test("markdown: code fence without matching lang falls back to text", () => {
  const src = "```unknown\nsome code\n```";
  const k = kinds(tok, src);
  assert(
    k.some((x) => x.startsWith("text:")),
    `expected text for unknown lang, got ${k}`,
  );
});

test("markdown: inline code", () => {
  const src = "Use `code` here";
  const k = kinds(tok, src);
  assert(
    k.some((x) => x.startsWith("string:`code`")),
    `expected string for inline code, got ${k}`,
  );
});

test("markdown: complete emphasis at a line start preserves semantic metadata", () => {
  const src = "**bold**";
  const tokens = new UnifiedTokenizer(markdown).tokenize(src);

  assert(
    tokens.every((token) => token.semantic === "text.bold"),
    `expected bold semantics on every delimiter token, got ${JSON.stringify(tokens)}`,
  );
  assert(renderHTML(src, tokens).includes('<span class="sh-text-bold">bold</span>'));
  assert(JSON.parse(renderJSON(src, tokens)).every((token) => token.semantic === "text.bold"));
});
