import type { LanguageDefinition } from "../core/lexer.ts";
const regex: LanguageDefinition = {
  name: "regex",
  aliases: ["regexp","re"],
  semantic: "generic",
  keywords: [],
  operators: ["|","*","+","?","{","}","(",")","[","]","^","$",".","\\","\\d","\\w","\\s","\\b","\\A","\\Z","(?","?:","?=","?!","?1","?P","?<","?#"],
  punctuation: ["(",")","[","]","{","}","|","*","+","?","^","$",".","\\","/","#","@","&","<",">",";",":","-","_","~","`","'","\"","!","%","&"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false},{open:"/",close:"/",escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true}], regex:false },
};
export default regex;
