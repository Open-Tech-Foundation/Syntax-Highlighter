import type { LanguageDefinition } from "../core/lexer.ts";
const powershell: LanguageDefinition = {
  name: "powershell",
  aliases: ["ps","ps1","psm1"],
  semantic: "generic",
  keywords: ["if","else","elseif","foreach","for","while","do","until","switch","try","catch","finally","throw","return","break","continue","function","filter","class","using","import","module","param","begin","process","end","in","not","and","or","xor","band","bor","bxor","is","isnot","as","join","split"],
  booleans: ["$true","$false"],
  nulls: ["$null"],
  operators: ["-eq","-ne","-gt","-ge","-lt","-le","-like","-notlike","-match","-notmatch","-contains","-notcontains","-in","-notin","-replace","-join","-split","==","!=","=","+","-","*","/","%","&","|","!","<",">"],
  punctuation: ["(",")","{","}","[","]",";",",","@","$","#",".",":"],
  lex: { strings: [{open:'"',close:'"',escape:"`",multiline:false},{open:"'",close:"'",escape:"",multiline:false}], comments: [{open:"#",close:"\n",line:true},{open:"<#",close:"#>"}], regex:false },
};
export default powershell;
