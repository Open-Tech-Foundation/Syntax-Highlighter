import type { LanguageDefinition } from "../core/lexer.ts";

const xml: LanguageDefinition = {
  name: "xml",
  aliases: ["xsl", "xslt", "svg", "rss", "atom"],
  semantic: "html",
  keywords: ["xml", "xmlns"],
  operators: ["="],
  punctuation: [
    "<",
    ">",
    "/",
    ";",
    ",",
    "?",
    "!",
    "-",
    "_",
    "[",
    "]",
    "(",
    ")",
    "{",
    "}",
    "#",
    "@",
    "$",
    "&",
    "|",
    "*",
    "+",
    "%",
    "~",
    "^",
  ],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [
      { open: "<!--", close: "-->" },
      { open: "<?", close: "?>" },
    ],
    regex: false,
  },
};
export default xml;
