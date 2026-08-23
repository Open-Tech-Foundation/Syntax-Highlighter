import type { LanguageDefinition } from "../core/lexer.ts";

const php: LanguageDefinition = {
  name: "php",
  semantic: "generic",
  keywords: [
    "abstract", "and", "array", "as", "break", "callable", "case", "catch",
    "class", "clone", "const", "continue", "declare", "default", "die", "do",
    "echo", "else", "elseif", "empty", "enddeclare", "endfor", "endforeach",
    "endif", "endswitch", "endwhile", "enum", "eval", "exit", "extends",
    "final", "finally", "fn", "for", "foreach", "function", "global", "goto",
    "if", "implements", "include", "include_once", "instanceof", "insteadof",
    "interface", "isset", "list", "match", "namespace", "new", "or", "print",
    "private", "protected", "public", "readonly", "require", "require_once",
    "return", "static", "switch", "throw", "trait", "try", "unset", "use",
    "var", "while", "xor", "yield", "from",
  ],
  booleans: ["true", "false"],
  nulls: ["null"],
  operators: [
    "===", "!==", "==", "!=", "<=", ">=", "<=>", "??", "&&", "||", "++", "--",
    "+=", "-=", "*=", "/=", "%=", ".=", "&=", "|=", "^=", "<<=", ">>=", "->", "=>", "::", "...",
    "=", "+", "-", "*", "/", "%", ".", "&", "|", "^", "~", "!", "<", ">", "?", ":", "$",
  ],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "@", "#", "\\"],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [
      { open: "//", close: "\n", line: true },
      { open: "#", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
    regex: false,
    identifierStart: /[a-zA-Z_\x7f-\xff]/,
    identifierPart: /[a-zA-Z0-9_\x7f-\xff]/,
  },
};

export default php;
