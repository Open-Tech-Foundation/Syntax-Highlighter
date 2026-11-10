import type { LanguageDefinition, StringDef } from "../core/lexer.ts";

/**
 * Double-quoted shell strings may span lines and contain `$( … )` command
 * substitutions with quotes of their own (`"$(dirname "$0")"`); scan past
 * those so the inner quotes do not end the string. Returns 0 for other
 * string kinds, leaving them to the default scanner.
 */
function scanShellString(def: StringDef, source: string, pos: number): number {
  if (def.open !== '"' && def.open !== '$"') return 0;
  return scanDoubleQuoted(source, pos + def.open.length);
}

function scanDoubleQuoted(source: string, from: number): number {
  let i = from;
  while (i < source.length) {
    const c = source[i];
    if (c === "\\") i += 2;
    else if (c === '"') return i + 1;
    else if (c === "$" && source[i + 1] === "(") i = skipSubstitution(source, i + 1);
    else if (c === "`") {
      const close = source.indexOf("`", i + 1);
      i = close === -1 ? source.length : close + 1;
    } else i++;
  }
  return source.length;
}

/** Index just past the `)` matching the `(` at `open`. */
function skipSubstitution(source: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < source.length) {
    const c = source[i];
    if (c === "\\") i += 2;
    else if (c === '"') i = scanDoubleQuoted(source, i + 1);
    else if (c === "'") {
      const close = source.indexOf("'", i + 1);
      i = close === -1 ? source.length : close + 1;
    } else {
      if (c === "(") depth++;
      else if (c === ")" && --depth === 0) return i + 1;
      i++;
    }
  }
  return source.length;
}

const bash: LanguageDefinition = {
  name: "bash",
  aliases: ["sh", "shell", "zsh", "bashrc", "ash"],
  semantic: "generic",
  keywords: [
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "while",
    "until",
    "do",
    "done",
    "case",
    "esac",
    "in",
    "function",
    "select",
    "time",
    "coproc",
    "declare",
    "local",
    "export",
    "return",
    "exit",
    "break",
    "continue",
    "shift",
    "source",
    "alias",
    "echo",
    "printf",
    "test",
    "true",
    "false",
  ],
  booleans: ["true", "false"],
  operators: [
    "&&",
    "||",
    ">>",
    "<<",
    ">>>",
    "2>",
    "&>",
    "==",
    "!=",
    "=~",
    "=",
    "+",
    "-",
    "*",
    "/",
    "%",
    "!",
    "|",
    "&",
    ";",
    "$",
    "?",
    ":",
    ".",
  ],
  punctuation: ["(", ")", "{", "}", "[", "]", ",", "@", "#"],
  classKeywords: [],
  typeDeclKeywords: [],
  classUsageKeywords: [],
  declarationKeywords: { function: "EXPECT_FUNCTION_NAME" },
  features: { declarations: true, contextStack: true, classDetection: true, shellStructure: true },
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
      { open: "`", close: "`", escape: "\\", multiline: false },
      { open: "$'", close: "'", escape: "\\", multiline: false },
      { open: '$"', close: '"', escape: "\\", multiline: false },
    ],
    comments: [{ open: "#", close: "\n", line: true }],
    regex: false,
    shebang: true,
    scanString: scanShellString,
  },
};

export default bash;
