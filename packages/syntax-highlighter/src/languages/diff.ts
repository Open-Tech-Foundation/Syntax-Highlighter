import type { LanguageDefinition } from "../core/lexer.ts";
const diff: LanguageDefinition = {
  name: "diff",
  aliases: ["patch"],
  semantic: "generic",
  keywords: ["diff","index","---","+++","@@"],
  operators: ["+","-","@@","---","+++"],
  punctuation: ["@","+","-","*","#","_","~","^","&","|","<",">",".",",",";","?","!","(",")","[","]","{","}"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [], regex:false },
};
export default diff;
