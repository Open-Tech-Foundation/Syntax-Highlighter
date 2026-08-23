import type { LanguageDefinition } from "../core/lexer.ts";
const typst: LanguageDefinition = {
  name: "typst",
  aliases: [],
  semantic: "generic",
  keywords: ["import", "include", "let", "set", "show", "if", "else", "for", "in", "return"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default typst;
