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
  features: { declarations: true, contextStack: true, classDetection: true },
  classKeywords: [],
  typeDeclKeywords: ["type", "interface", "union", "enum", "input", "scalar"],
  classUsageKeywords: [],
  declarationKeywords: {
    type: "EXPECT_CLASS_NAME",
    interface: "EXPECT_CLASS_NAME",
    union: "EXPECT_CLASS_NAME",
    enum: "EXPECT_CLASS_NAME",
    input: "EXPECT_CLASS_NAME",
    scalar: "EXPECT_CLASS_NAME",
  },
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
