import type { LanguageDefinition } from "../core/lexer.ts";
const dart: LanguageDefinition = {
  name: "dart",
  aliases: ["dartlang"],
  semantic: "generic",
  keywords: ["abstract","as","assert","async","await","break","case","catch","class","const","continue","covariant","default","deferred","do","dynamic","else","enum","export","extends","extension","external","factory","false","final","finally","for","Function","get","hide","if","implements","import","in","interface","is","late","library","mixin","new","null","on","operator","part","required","rethrow","return","set","show","static","super","switch","sync","this","throw","true","try","typedef","var","void","while","with","yield"],
  booleans: ["true","false"],
  nulls: ["null"],
  operators: ["=>","??","?.","..","...","==","!=","<=",">=","&&","||","+=","-=","*=","/=","%=","=","+","-","*","/","%","&","|","^","~","!","<",">","?",":","."],
  punctuation: ["(",")","{","}","[","]",";",",","@","#"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false},{open:'"""',close:'"""',escape:"\\",multiline:true}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default dart;
