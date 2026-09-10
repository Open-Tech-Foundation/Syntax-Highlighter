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
  const tokenizer = new UnifiedTokenizer(markdown);
  const k = kinds(tokenizer, src);
  assert(k.includes("keyword:# Heading 1"), `expected keyword for h1, got ${k}`);
  assert(k.includes("keyword:## Heading 2"), `expected keyword for h2, got ${k}`);
  assert(k.includes("keyword:### Heading 3"), `expected keyword for h3, got ${k}`);
  assert(
    tokenizer
      .tokenize(src)
      .every((token) => token.type === "whitespace" || token.semantic === "markup.heading"),
    "headings should carry markup.heading semantics",
  );
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
  const tokenizer = new UnifiedTokenizer(markdown);
  const k = kinds(tokenizer, src);
  assert(
    k.some((x) => x.startsWith("string:`code`")),
    `expected string for inline code, got ${k}`,
  );
  assert(
    tokenizer.tokenize(src).some((token) => token.semantic === "code.inline"),
    "inline code should carry code.inline semantics",
  );
});

test("markdown: links, images, escapes, and list markers carry markup semantics", () => {
  const src = "- [link](https://example.com) ![image](image.png) \\*";
  const tokens = new UnifiedTokenizer(markdown).tokenize(src);
  const semantics = new Set(tokens.map((token) => token.semantic));
  for (const semantic of ["markup.list", "markup.link", "markup.image", "syntax.escape"]) {
    assert(semantics.has(semantic), `expected ${semantic}, got ${JSON.stringify(tokens)}`);
  }
});

test("markdown: tables, tasks, footnotes, and HTML tags carry markup semantics", () => {
  const src = ["| Name | Value |", "- [x] Completed task [^1]", "<details>"].join("\n");
  const semantics = new Set(
    new UnifiedTokenizer(markdown).tokenize(src).map((token) => token.semantic),
  );
  for (const semantic of ["markup.table", "markup.task", "markup.footnote", "markup.html"]) {
    assert(semantics.has(semantic), `expected ${semantic}`);
  }
});

test("markdown: built-in code fences delegate JavaScript and Python", () => {
  const src = "```javascript\nconst value = true;\n```\n```python\ndef greet():\n  return 42\n```";
  const k = kinds(new UnifiedTokenizer(markdown), src);
  assert(k.includes("keyword:const"), `expected JavaScript tokens, got ${k}`);
  assert(k.includes("keyword:def"), `expected Python tokens, got ${k}`);
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

test("markdown: line tokens reset punctuation state before the next paragraph", () => {
  const src = "This is **bold**.\n\nThis is *italic*.";
  const tokens = new UnifiedTokenizer(markdown).tokenize(src);
  const text = tokens.filter((token) => src.slice(token.start, token.end) === "This")[1];
  assert(text?.type === "variable", `expected paragraph text, got ${JSON.stringify(text)}`);
});

test("markdown: recognizes ordered and indented unordered list markers", () => {
  const ordered = kinds(new UnifiedTokenizer(markdown), "1. First item");
  assert(ordered.includes("operator:1. "), `expected ordered list marker, got ${ordered}`);

  const nested = kinds(new UnifiedTokenizer(markdown), "  * Nested item");
  assert(nested.includes("operator:* "), `expected nested list marker, got ${nested}`);
  assert(
    !nested.some((token) => token.includes("text: Nested item")),
    `unexpected emphasis: ${nested}`,
  );
});

test("markdown: combined emphasis stays on one line and has one semantic style", () => {
  const src = "***bold and italic***";
  const tokens = new UnifiedTokenizer(markdown).tokenize(src);
  assert(
    tokens.every((token) => token.semantic === "text.bold-italic"),
    `expected combined emphasis semantics, got ${JSON.stringify(tokens)}`,
  );
  assert(renderHTML(src, tokens).includes('class="sh-text-bold-italic"'));
});
