import type { LanguageDefinition } from "../core/lexer.ts";
const actions: LanguageDefinition = {
  name: "actions",
  aliases: ["github-actions","gha","workflow"],
  semantic: "generic",
  keywords: ["name","on","push","pull_request","workflow_dispatch","jobs","runs-on","steps","uses","run","with","env","if","needs","strategy","matrix","include","exclude","continue-on-error","timeout-minutes","permissions","concurrency","outputs","services","container","defaults","shell"],
  operators: [":","-","|","&","!","?",".",","],
  punctuation: ["[","]","{","}","(",")",";",",","#","@","$","%","&","|","<",">",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-","|","&","#","!","?",".",",",";",":"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true}], regex:false },
};
export default actions;
