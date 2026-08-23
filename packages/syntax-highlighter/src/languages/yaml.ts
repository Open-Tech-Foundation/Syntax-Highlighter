import type { LanguageDefinition } from "../core/lexer.ts";

const yaml: LanguageDefinition = {
  name: "yaml",
  aliases: ["yml"],
  semantic: "generic",
  keywords: [],
  booleans: ["true", "false", "yes", "no", "on", "off"],
  nulls: ["null", "~"],
  operators: [":", "-", "|", ">", "?", "*", "&", "!", "%", "@", "`"],
  punctuation: ["{", "}", "[", "]", ",", "."],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "''", multiline: false },
    ],
    comments: [{ open: "#", close: "\n", line: true }],
    regex: false,
  },
};

export default yaml;
