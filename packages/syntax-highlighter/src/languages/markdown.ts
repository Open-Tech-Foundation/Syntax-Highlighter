import type { LanguageDefinition } from "../core/lexer.ts";
import { semantics } from "../core/semantics.ts";
import javascript from "./javascript.ts";
import python from "./python.ts";
import typescript from "./typescript.ts";

const markdown: LanguageDefinition = {
  name: "markdown",
  aliases: ["md", "mdx", "mkd"],
  semantic: "generic",
  features: {
    lineBreakResetsExpectation: true,
  },
  keywords: [],
  operators: [
    "#",
    "##",
    "###",
    "####",
    "#####",
    "######",
    "-",
    "*",
    "+",
    ">",
    "|",
    "=",
    "!",
    "`",
    "~",
  ],
  punctuation: [
    "[",
    "]",
    "(",
    ")",
    "{",
    "}",
    "<",
    ">",
    ":",
    ".",
    ",",
    ";",
    "-",
    "_",
    "`",
    "#",
    "*",
    "!",
  ],
  lex: {
    strings: [
      { open: "`", close: "`", escape: "\\", multiline: false, semantic: semantics.code.inline },
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    inlinePatterns: [
      { pattern: /^!\[[^\]\n]*\]\([^)\n]*\)/, type: "text", semantic: semantics.markup.image },
      { pattern: /^\[[^\]\n]+\]\([^)\n]*\)/, type: "text", semantic: semantics.markup.link },
      { pattern: /^\\./, type: "text", semantic: semantics.syntax.escape },
    ],
    comments: [{ open: "<!--", close: "-->" }],
    delimiters: [
      { open: "***", close: "***", semantic: semantics.text.boldItalic },
      { open: "___", close: "___", semantic: semantics.text.boldItalic },
      { open: "**", close: "**", semantic: semantics.text.bold },
      { open: "__", close: "__", semantic: semantics.text.bold },
      { open: "*", close: "*", semantic: semantics.text.italic },
      { open: "_", close: "_", semantic: semantics.text.italic },
      { open: "~~", close: "~~", semantic: semantics.text.strikethrough },
    ],
    regex: false,
    linePrefixes: {
      "#": "keyword",
      "##": "keyword",
      "###": "keyword",
      "####": "keyword",
      "#####": "keyword",
      "######": "keyword",
      ">": "comment",
      "-": "operator",
      "*": "operator",
      "+": "operator",
    },
    linePrefixPatterns: [
      { pattern: /^#{1,6}\s+/, type: "keyword", semantic: semantics.markup.heading },
      { pattern: /^>\s?/, type: "comment", semantic: semantics.markup.quote, wholeLine: false },
      { pattern: /^[-+*]\s+/, type: "operator", semantic: semantics.markup.list, wholeLine: false },
      {
        pattern: /^\d+[.)]\s+/,
        type: "operator",
        semantic: semantics.markup.list,
        wholeLine: false,
      },
    ],
    codeFences: [
      {
        open: "```",
        close: "```",
        embed: {
          javascript,
          js: javascript,
          typescript,
          ts: typescript,
          python,
          py: python,
        },
      },
    ],
  },
};

export default markdown;
