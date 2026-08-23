import type { LanguageDefinition } from "../core/lexer.ts";
const rst: LanguageDefinition = {
  name: "rst",
  aliases: ["restructuredtext","rest"],
  semantic: "generic",
  keywords: ["..","::","note","warning","image","figure","table","code","code-block","include","toctree","automodule","autoclass","autofunction"],
  operators: ["..","::","==","--","__",":","`","|","*","#"],
  punctuation: ["[","]","(",")","{","}","<",">","`","*","_","|","*","#",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-","=","-","`","'","*","_","|","#","!","?",".",",",";",":"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false},{open:"``",close:"``",escape:"",multiline:false}], comments: [{open:"..",close:"\n",line:true}], regex:false },
};
export default rst;
