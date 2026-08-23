import type { LanguageDefinition } from "../core/lexer.ts";
const julia: LanguageDefinition = {
  name: "julia",
  aliases: ["jl"],
  semantic: "generic",
  keywords: ["baremodule","begin","break","catch","const","continue","do","else","elseif","end","export","false","finally","for","function","global","if","import","let","local","macro","module","quote","return","struct","true","try","using","while","mutable","primitive","abstract","type","where","in","isa","import","using","where","do","if","else","elseif","end","for","while","break","continue","return","try","catch","finally","throw","let","global","local","const"],
  booleans: ["true","false"],
  nulls: ["nothing","missing","nothing","undef"],
  operators: ["=>","->","==","===","!=","!==","<",">","<=",">=","=","+=","-=","*=","/=","&&","||","!","&","|","^","~","<:",">:","::",":","...","|>",":",".",",","?",";"],
  punctuation: ["(",")","{","}","[","]",";",",","#","@","$","%","&","|","<",">",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:'"""',close:'"""',escape:"\\",multiline:true},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true},{open:"#=",close:"=#"}], regex:false },
};
export default julia;
