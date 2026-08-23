import type { LanguageDefinition } from "../core/lexer.ts";
const ocaml: LanguageDefinition = {
  name: "ocaml",
  aliases: ["ml"],
  semantic: "generic",
  keywords: ["let", "rec", "and", "if", "then", "else", "match", "with", "when", "function", "fun", "try", "with", "for", "while", "do", "done", "to", "downto", "open", "module", "type", "let", "val", "true", "false", "null"],
  operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "?", ":", ".", ",", ";"],
  punctuation: ["(", ")", "{", "}", "[", "]", ";", ",", "#", "@", "$", "%", "&", "|", "<", ">", ".", "_", "~", "`", "'", "\"", "\\", "?", "!", "^"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default ocaml;
