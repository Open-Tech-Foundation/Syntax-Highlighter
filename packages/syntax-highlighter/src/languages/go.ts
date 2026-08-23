import type { LanguageDefinition } from "../core/lexer.ts";

const go: LanguageDefinition = {
  name: "go",
  aliases: ["golang"],
  semantic: "generic",
  keywords: [
    "break", "default", "func", "interface", "select", "case", "defer", "go",
    "map", "struct", "chan", "else", "goto", "package", "switch", "const",
    "fallthrough", "if", "range", "type", "continue", "for", "import",
    "return", "var",
  ],
  booleans: ["true", "false"],
  nulls: ["nil"],
  operators: [
    ":=", "<<=", ">>=", "&^=", "&&", "||", "==", "!=", "<=", ">=", "++", "--",
    "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<-", "...",
    "=", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "<", ">", ":", ".",
  ],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "."],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
      { open: "`", close: "`", escape: "\\", multiline: true },
    ],
    comments: [
      { open: "//", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
    regex: false,
    identifierStart: /[_\p{ID_Start}]/u,
    identifierPart: /[_\p{ID_Continue}]/u,
  },
};

export default go;
