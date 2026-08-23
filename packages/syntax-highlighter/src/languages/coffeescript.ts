import type { LanguageDefinition } from "../core/lexer.ts";
const coffeescript: LanguageDefinition = {
  name: "coffeescript",
  aliases: ["coffee"],
  semantic: "generic",
  keywords: ["if", "else", "for", "while", "return", "class", "extends", "super", "this", "true", "false", "null", "undefined", "->", "=>"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default coffeescript;
