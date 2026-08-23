import type { LanguageDefinition } from "../core/lexer.ts";
const scss: LanguageDefinition = {
  name: "scss",
  aliases: ["sass"],
  semantic: "generic",
  keywords: ["@import","@mixin","@include","@function","@return","@if","@else","@for","@each","@while","@extend","@use","@forward","@error","@warn","@debug","@at-root"],
  operators: [":","::",";","+","-","*","/","%","=","==","!=","<",">","<=",">=","&&","||","!","&","|","^","~","?",".",","],
  punctuation: ["(",")","{","}","[","]",";",",","#","@","$","&","%"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default scss;
