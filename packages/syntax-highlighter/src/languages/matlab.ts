import type { LanguageDefinition } from "../core/lexer.ts";
const matlab: LanguageDefinition = {
  name: "matlab",
  aliases: ["octave","mat"],
  semantic: "generic",
  keywords: ["break","case","catch","classdef","continue","else","elseif","end","for","function","global","if","otherwise","parfor","persistent","return","spmd","switch","try","while","true","false","Inf","NaN","nil"],
  booleans: ["true","false"],
  nulls: ["NaN","Inf"],
  operators: ["==","~=","<=",">=","&&","||","=","+","-","*","/","\\","^",".*","./",".\\",".^","'",".'","<",">","&","|","~",":",";","...",","],
  punctuation: ["(",")","{","}","[","]",";",",","@","#","$","%","_","."],
  lex: { strings: [{open:"'",close:"'",escape:"''",multiline:false},{open:'"',close:'"',escape:"\\",multiline:false}], comments: [{open:"%",close:"\n",line:true},{open:"%{",close:"%}"}], regex:false },
};
export default matlab;
