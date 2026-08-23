import type { LanguageDefinition } from "../core/lexer.ts";

const markdown: LanguageDefinition = {
  name: "markdown",
  aliases: ["md", "mdx", "mkd"],
  semantic: "generic",
  keywords: [],
  operators: ["#", "##", "###", "####", "#####", "######", "-", "*", "+", ">", "|", "=", "!", "`", "~"],
  punctuation: ["[", "]", "(", ")", "{", "}", "<", ">", ":", ".", ",", ";", "-", "_", "`", "#", "*", "!"],
  lex: {
    strings: [
      { open: "`", close: "`", escape: "\\", multiline: false },
      { open: "```", close: "```", escape: "\\", multiline: true },
      { open: '"', close: '"', escape: "\\", multiline: false },
      { open: "'", close: "'", escape: "\\", multiline: false },
    ],
    comments: [{ open: "<!--", close: "-->" }],
    regex: false,
  },
};

export default markdown;
