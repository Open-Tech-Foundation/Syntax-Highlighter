import type { LanguageDefinition } from "../core/lexer.ts";

const stf: LanguageDefinition = {
  name: "stf",
  aliases: ["stfs", "stf-schema"],
  semantic: "generic",
  keywords: [
    "DATE",
    "TIMESTAMP",
    "DECIMAL",
    "BIGINT",
    "BINARY",
    "Geometry",
    "GEOMETRY",
    "Time",
    "TIME",
    "Duration",
    "DURATION",
    "@version",
    "@schema",
    "version",
    "schema",
  ],
  booleans: ["T", "F"],
  nulls: ["N"],
  operators: [":", ",", "=", "=>", "->", "@"],
  punctuation: ["{", "}", "[", "]", "(", ")", ":", ",", "@", "#"],
  lex: {
    strings: [
      { open: "`", close: "`", escape: "", multiline: false },
      { open: '"', close: '"', escape: "\\", multiline: false },
    ],
    comments: [{ open: "#", close: "\n", line: true }],
    regex: false,
  },
};
export default stf;
