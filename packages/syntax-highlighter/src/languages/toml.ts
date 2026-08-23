import type { LanguageDefinition } from "../core/lexer.ts";

const toml: LanguageDefinition = {
  name: "toml",
  semantic: "generic",
  keywords: ["true", "false"],
  booleans: ["true", "false"],
  operators: ["="],
  punctuation: ["[", "]", "{", "}", "(", ")", ";", ",", ".", "-", "_"],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
      { open: '"""', close: '"""', escape: "\\", multiline: true },
      { open: "'''", close: "'''", escape: "", multiline: true },
    ],
    comments: [{ open: "#", close: "\n", line: true }],
    regex: false,
  },
};
export default toml;
