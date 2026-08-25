import type { LanguageDefinition } from "../core/lexer.ts";

const graphql: LanguageDefinition = {
  name: "graphql",
  aliases: ["gql"],
  semantic: "generic",
  keywords: [
    "query",
    "mutation",
    "subscription",
    "fragment",
    "on",
    "type",
    "interface",
    "union",
    "enum",
    "input",
    "scalar",
    "extend",
    "directive",
    "schema",
  ],
  booleans: ["true", "false", "null"],
  nulls: ["null"],
  operators: ["=", "!", "?", "&", "|", ":", "@", "$", "..."],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "!", "?", "@", "$", "&", "|", ".", ":"],
  lex: {
    strings: [
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: '"""', close: '"""', escape: "\\", multiline: true },
    ],
    comments: [{ open: "#", close: "\n", line: true }],
    regex: false,
  },
};
export default graphql;
