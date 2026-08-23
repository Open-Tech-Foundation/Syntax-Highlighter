import type { LanguageDefinition } from "../core/lexer.ts";
const ada: LanguageDefinition = {
  name: "ada",
  aliases: [],
  semantic: "generic",
  keywords: ["procedure", "function", "package", "begin", "end", "if", "then", "else", "elsif", "loop", "while", "for", "in", "is", "record", "type", "with", "use", "true", "false", "null"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default ada;
