import type { LanguageDefinition } from "../core/lexer.ts";
const pug: LanguageDefinition = {
  name: "pug",
  aliases: ["jade"],
  semantic: "generic",
  keywords: ["extends","block","include","mixin","if","else","unless","each","for","while","case","when","default","append","prepend"],
  operators: ["=","!=","==","===","-","=","+","!","&","|","#",".",",","|","&","#","!","="],
  punctuation: ["(",")","{","}","[","]",";",",","#","@","$","%","&","|","<",">",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-","*","+","%","-","_","|","&","#","!","=","|"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false},{open:"`",close:"`",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"//-",close:"\n",line:true}], regex:false },
};
export default pug;
