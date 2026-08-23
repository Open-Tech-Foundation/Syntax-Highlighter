import type { LanguageDefinition } from "../core/lexer.ts";
const solidity: LanguageDefinition = {
  name: "solidity",
  aliases: ["sol"],
  semantic: "generic",
  keywords: ["pragma","solidity","contract","interface","library","abstract","is","using","for","struct","enum","event","modifier","function","constructor","fallback","receive","public","private","internal","external","view","pure","payable","virtual","override","returns","return","if","else","for","while","do","break","continue","try","catch","emit","require","assert","revert","assembly","let","true","false","mapping","address","bool","string","bytes","uint","int","uint8","uint256","int256","bytes32"],
  booleans: ["true","false"],
  nulls: [],
  operators: ["=>","==","!=","<=",">=","&&","||","+=","-=","*=","/=","%=","<<=",">>=", "&=","|=","^=","=","+","-","*","/","%","&","|","^","~","!","<",">","?",";",":",".","..","**"],
  punctuation: ["(",")","{","}","[","]",";",",","@","#","$","%","&","|","<",">",".",":","_","~","`","'","\"","\\","?","!"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"//",close:"\n",line:true},{open:"/*",close:"*/"}], regex:false },
};
export default solidity;
