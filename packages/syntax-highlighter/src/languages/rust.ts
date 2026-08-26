import type { LanguageDefinition, StringDef } from "../core/lexer.ts";

function rustScanString(def: StringDef, source: string, pos: number): number {
  // Only handle single-quote strings (char literals vs lifetimes)
  if (def.open !== "'") return 0;

  const afterOpen = pos + 1;
  if (afterOpen >= source.length) return 0;
  const ch = source[afterOpen];

  // Lifetime: 'identifier (letter/_ after quote, no closing quote nearby)
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
    const quoteIdx = source.indexOf("'", afterOpen + 1);
    if (quoteIdx === -1 || quoteIdx - afterOpen > 2) {
      // No closing quote or multi-char content → lifetime, not a string.
      // Emit the ' as a standalone token; advance past it.
      return afterOpen;
    }
  }

  // Char literal: scan through matching the default scanString logic
  let i = afterOpen;
  while (i < source.length) {
    const c = source[i];
    if (c === "\\" && i + 1 < source.length) {
      i += 2;
      continue;
    }
    if (c === "\n") break;
    if (c === "'") {
      i += 1;
      return i;
    }
    i += 1;
  }
  return 0;
}

const rust: LanguageDefinition = {
  name: "rust",
  aliases: ["rs"],
  semantic: "generic",
  keywords: [
    "as",
    "break",
    "const",
    "continue",
    "crate",
    "else",
    "enum",
    "extern",
    "false",
    "fn",
    "for",
    "if",
    "impl",
    "in",
    "let",
    "loop",
    "match",
    "mod",
    "move",
    "mut",
    "pub",
    "ref",
    "return",
    "self",
    "Self",
    "static",
    "struct",
    "super",
    "trait",
    "true",
    "type",
    "unsafe",
    "use",
    "where",
    "while",
    "async",
    "await",
    "dyn",
    "abstract",
    "become",
    "box",
    "do",
    "final",
    "macro",
    "override",
    "priv",
    "typeof",
    "unsized",
    "virtual",
    "yield",
    "try",
    "union",
  ],
  controls: ["match", "loop"],
  booleans: ["true", "false"],
  operators: [
    "=>",
    "->",
    "::",
    "&&",
    "||",
    "==",
    "!=",
    "<=",
    ">=",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&=",
    "|=",
    "^=",
    "<<=",
    ">>=",
    "<<",
    ">>",
    "=",
    "+",
    "-",
    "*",
    "/",
    "%",
    "&",
    "|",
    "^",
    "~",
    "!",
    "<",
    ">",
    "?",
    ":",
    ".",
    "..",
    "..=",
    "...",
  ],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@"],
  lex: {
    strings: [
      // Prefixed forms first — openers match longest-first.
      { open: 'br#"', close: '"#', escape: "", multiline: true },
      { open: 'r#"', close: '"#', escape: "", multiline: true },
      { open: 'br"', close: '"', escape: "\\", multiline: false },
      { open: 'b"', close: '"', escape: "\\", multiline: false },
      { open: 'r"', close: '"', escape: "", multiline: true },
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [
      { open: "//", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
    regex: false,
    scanString: rustScanString,
  },
};

export default rust;
