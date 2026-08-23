import type { LanguageDefinition } from "../core/lexer.ts";
const haml: LanguageDefinition = {
  name: "haml",
  aliases: [],
  semantic: "generic",
  keywords: ["%html", "%head", "%body", "%div", "%span", "if", "else", "each", "for"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default haml;
