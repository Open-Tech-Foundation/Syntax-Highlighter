import type { LanguageDefinition } from "../core/lexer.ts";

const typescript: LanguageDefinition = {
  name: "typescript",
  aliases: ["ts", "tsx", "mts", "cts"],
  semantic: "generic",
  keywords: [
    "abstract", "as", "async", "await", "break", "case", "catch", "class",
    "const", "constructor", "continue", "debugger", "declare", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally",
    "for", "from", "function", "get", "if", "implements", "import", "in",
    "infer", "instanceof", "interface", "is", "keyof", "let", "module",
    "namespace", "never", "new", "null", "number", "object", "of", "package",
    "private", "protected", "public", "readonly", "require", "return", "set",
    "static", "string", "super", "switch", "symbol", "this", "throw", "true",
    "try", "type", "typeof", "undefined", "unique", "unknown", "var", "void",
    "while", "with", "yield",
  ],
  booleans: ["true", "false"],
  nulls: ["null", "undefined"],
  constants: ["NaN", "Infinity"],
  operators: [
    "=>", "...", "?.", "??", "===", "!==", "**=", "<<=", ">>=", ">>>=", "&&=", "||=", "??=",
    "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
    "**", "<<", ">>", ">>>", "=", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "<", ">", "?", ":",
  ],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "."],
  lex: {
    strings: [
      { open: "'", close: "'", escape: "\\", multiline: false },
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "`", close: "`", escape: "\\", multiline: true, template: true },
    ],
    comments: [
      { open: "//", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
    identifierStart: /[$_\p{ID_Start}]/u,
    identifierPart: /[$_\u200C\u200D\p{ID_Continue}]/u,
    regex: true,
    regexAfterParenKeywords: ["if", "for", "while", "with", "switch", "catch"],
    shebang: true,
  },
};

export default typescript;
