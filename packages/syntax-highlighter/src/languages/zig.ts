import type { LanguageDefinition } from "../core/lexer.ts";
const zig: LanguageDefinition = {
  name: "zig",
  semantic: "generic",
  keywords: ["addrspace","align","allowzero","and","anyframe","anytype","asm","async","await","break","callconv","catch","comptime","const","continue","defer","else","enum","errdefer","error","export","extern","false","fn","for","if","inline","noalias","noinline","nosuspend","null","or","orelse","packed","pub","resume","return","linksection","struct","suspend","switch","test","threadlocal","true","try","union","unreachable","usingnamespace","var","volatile","while"],
  booleans: ["true","false"],
  nulls: ["null","undefined"],
  operators: ["==","!=","<=",">=","&&","||","+=","-=","*=","/=","%=","&=","|=","^=","<<=","||=","!","?","->","=>","=","+","-","*","/","%","&","|","^","~","<",">",":","."],
  punctuation: ["(",")","{","}","[","]",";",",","@","#","$"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true}], regex:false },
};
export default zig;
