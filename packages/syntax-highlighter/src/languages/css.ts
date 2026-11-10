import type { LanguageDefinition } from "../core/lexer.ts";

const css: LanguageDefinition = {
  name: "css",
  semantic: "generic",
  keywords: [
    "import",
    "media",
    "supports",
    "keyframes",
    "font-face",
    "charset",
    "namespace",
    "layer",
    "container",
    "property",
    "counter-style",
  ],
  operators: [":", "::", "=", ">", "+", "~", "*", "|", "^", "$", "!"],
  punctuation: ["{", "}", "(", ")", "[", "]", ";", ",", ".", "#", "/", "%"],
  features: { styleSheet: true },
  lex: {
    // Before identifiers: `-0.5` would otherwise lex as an identifier (`-`
    // can start one), and a unit belongs to its number (`1rem`, `50%`).
    inlinePatterns: [
      { pattern: /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:%|[a-zA-Z]+)?/, type: "number" },
      // Hex color or `#id`; the style-sheet pass decides which from context.
      { pattern: /^#[0-9a-fA-F]{3,8}(?![\w-])/, type: "number" },
    ],
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [{ open: "/*", close: "*/" }],
    identifierStart: /[a-zA-Z_-]/,
    identifierPart: /[a-zA-Z0-9_-]/,
    regex: false,
  },
};

export default css;
