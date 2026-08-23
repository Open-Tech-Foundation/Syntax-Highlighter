import type { LanguageDefinition } from "../core/lexer.ts";
const pascal: LanguageDefinition = {
  name: "pascal",
  aliases: ["pas"],
  semantic: "generic",
  keywords: ["program", "begin", "end", "if", "then", "else", "while", "do", "for", "to", "downto", "case", "of", "function", "procedure", "var", "const", "type", "uses", "true", "false", "nil"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default pascal;
