import type { LanguageDefinition } from "../core/lexer.ts";

const yaml: LanguageDefinition = {
  name: "yaml",
  aliases: ["yml"],
  semantic: "generic",
  keywords: [],
  // YAML 1.2: yes/no/on/off are plain strings (and `on:` is a key).
  booleans: ["true", "false"],
  nulls: ["null", "~"],
  operators: [":", "-", "|", ">", "?", "*", "&", "!", "%", "@", "`"],
  punctuation: ["{", "}", "[", "]", ",", "."],
  features: { yamlStructure: true },
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
