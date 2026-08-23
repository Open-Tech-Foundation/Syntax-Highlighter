import type { LanguageDefinition } from "../core/lexer.ts";

const json: LanguageDefinition = {
  name: "json",
  aliases: ["jsonc", "json5"],
  semantic: "generic",
  keywords: [],
  booleans: ["true", "false"],
  nulls: ["null"],
  operators: [":"],
  punctuation: ["{", "}", "[", "]", ","],
  lex: {
    strings: [{ open: '"', close: '"', escape: "\\", multiline: false }],
    comments: [
      { open: "//", close: "\n", line: true },
      { open: "/*", close: "*/" },
    ],
    regex: false,
  },
};

export default json;
