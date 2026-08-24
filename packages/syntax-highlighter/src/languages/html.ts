import type { LanguageDefinition } from "../core/lexer.ts";

const html: LanguageDefinition = {
  name: "html",
  aliases: ["htm", "xhtml"],
  semantic: "html",
  keywords: [],
  operators: ["=", "/"],
  punctuation: ["<", ">", "(", ")", "{", "}", "[", "]", ";", ",", ":", ".", "-", "!", "?", "&"],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [{ open: "<!--", close: "-->" }],
    identifierStart: /[a-zA-Z_]/,
    identifierPart: /[a-zA-Z0-9_\-:]/,
    regex: false,
    shebang: false,
  },
};

export default html;
