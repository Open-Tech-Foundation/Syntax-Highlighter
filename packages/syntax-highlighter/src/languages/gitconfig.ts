import type { LanguageDefinition } from "../core/lexer.ts";
const gitconfig: LanguageDefinition = {
  name: "gitconfig",
  aliases: ["git-config","gitignore","gitattributes"],
  semantic: "generic",
  keywords: ["true","false","yes","no","on","off"],
  booleans: ["true","false","yes","no","on","off"],
  operators: ["="],
  punctuation: ["[","]","{","}","(",")",";",",","#","@","$","%","&","|","<",">",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-","\"","'","`"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true},{open:";",close:"\n",line:true}], regex:false },
};
export default gitconfig;
