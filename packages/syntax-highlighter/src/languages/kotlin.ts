import type { LanguageDefinition } from "../core/lexer.ts";

const kotlin: LanguageDefinition = {
  name: "kotlin",
  aliases: ["kt", "kts"],
  semantic: "generic",
  keywords: [
    "as", "break", "class", "continue", "do", "else", "false", "for", "fun",
    "if", "in", "interface", "is", "null", "object", "package", "return",
    "super", "this", "throw", "true", "try", "typealias", "typeof", "val",
    "var", "when", "while", "by", "catch", "constructor", "delegate", "dynamic",
    "field", "file", "finally", "get", "import", "init", "param", "property",
    "receiver", "set", "setparam", "where", "actual", "abstract", "annotation",
    "companion", "const", "crossinline", "data", "enum", "expect", "external",
    "final", "infix", "inline", "inner", "internal", "lateinit", "noinline",
    "open", "operator", "out", "override", "private", "protected", "public",
    "reified", "sealed", "suspend", "tailrec", "vararg",
  ],
  booleans: ["true", "false"],
  nulls: ["null"],
  operators: [
    "==", "!=", "===", "!==", "<=", ">=", "&&", "||", "!!", "?.", "?:", "->", "=>", "::",
    "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "<<=", ">>=",
    "=", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "<", ">", "?", ":", ".", "..", "...",
  ],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", ":", ".", "@", "#", "$"],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: '"""', close: '"""', escape: "\\", multiline: true },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [
      { open: "//", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
    regex: false,
  },
};

export default kotlin;
