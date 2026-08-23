import type { LanguageDefinition } from "../core/lexer.ts";
const assembly: LanguageDefinition = {
  name: "assembly",
  aliases: ["asm","nasm","yasm","gas"],
  semantic: "generic",
  keywords: ["mov","add","sub","mul","div","jmp","je","jne","jg","jl","call","ret","push","pop","cmp","test","and","or","xor","not","inc","dec","lea","int","syscall","section","global","extern","db","dw","dd","dq","equ","align"],
  operators: ["+","-","*","/","%","&","|","^","~","!","<",">","=","==","!=","<=",">=",".",",",";",":","#","@","$","%","&","|"],
  punctuation: ["[","]","(",")","{","}",";",",","#","@","$","%","&","|","<",">",".","_","~","`","'","\"","\\","?","!","^","&","|",";",":","=","/","-","*","+","%"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:";",close:"\n",line:true},{open:"#",close:"\n",line:true},{open:"//",close:"\n",line:true}], regex:false },
};
export default assembly;
