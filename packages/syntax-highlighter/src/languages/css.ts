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
  lex: {
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
