import type { LanguageDefinition } from "../core/lexer.ts";
import javascript from "./javascript.ts";
import css from "./css.ts";

const html: LanguageDefinition = {
  name: "html",
  aliases: ["htm", "xhtml"],
  semantic: "generic",
  markup: {
    tags: true,
    embed: { script: javascript, style: css },
  },
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
