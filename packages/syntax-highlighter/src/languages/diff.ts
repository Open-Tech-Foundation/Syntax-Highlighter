import type { LanguageDefinition } from "../core/lexer.ts";

const diff: LanguageDefinition = {
  name: "diff",
  aliases: ["patch"],
  semantic: "generic",
  keywords: ["diff", "index"],
  operators: [],
  punctuation: ["a", "b"],
  lex: {
    strings: [],
    comments: [],
    regex: false,
    linePrefixes: {
      "+++": "header",
      "---": "header",
      "@@": "hunk",
      "+": "addition",
      "-": "deletion",
    },
  },
};
export default diff;
