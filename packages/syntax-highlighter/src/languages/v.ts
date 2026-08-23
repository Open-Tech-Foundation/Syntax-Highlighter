import type { LanguageDefinition } from "../core/lexer.ts";
const v: LanguageDefinition = {
  name: "v",
  aliases: ["vlang"],
  semantic: "generic",
  keywords: ["module", "import", "fn", "struct", "enum", "interface", "if", "else", "for", "in", "while", "return", "true", "false", "none", "mut"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default v;
