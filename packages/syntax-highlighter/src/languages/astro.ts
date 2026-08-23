import type { LanguageDefinition } from "../core/lexer.ts";
const astro: LanguageDefinition = {
  name: "astro",
  semantic: "generic",
  keywords: ["import","export","from","if","else","for","while","return","const","let","var","function","class","interface","type","async","await","fetch","props","Astro"],
  operators: ["=>","==","!=","<=",">=","&&","||","=","+","-","*","/","%","!","<",">","?",";",":",".",",","#","@","$","%","&","|","---"],
  punctuation: ["(",")","{","}","[","]","<",">","/",";",",","#","@","$","%","&","|",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-","*","+","%","-","_"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false},{open:"`",close:"`",escape:"\\",multiline:false}], comments: [{open:"<!--",close:"-->"},{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default astro;
