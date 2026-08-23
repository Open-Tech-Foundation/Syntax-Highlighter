import type { LanguageDefinition } from "../core/lexer.ts";
const latex: LanguageDefinition = {
  name: "latex",
  aliases: ["tex","bibtex"],
  semantic: "generic",
  keywords: ["\\documentclass","\\usepackage","\\begin","\\end","\\section","\\subsection","\\chapter","\\paragraph","\\label","\\ref","\\cite","\\caption","\\textbf","\\textit","\\emph","\\frac","\\sqrt","\\sum","\\int","\\item","\\newcommand","\\renewcommand","\\def","\\if","\\else","\\fi"],
  operators: ["\\","=","^","_","&"],
  punctuation: ["{","}","[","]","(",")",";",".",",","#","@","$","%","&","|","<",">","*","+","-","/","%","~","`","'","\"","\\","?","!","^","_","&","|",";",":"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false}], comments: [{open:"%",close:"\n",line:true}], regex:false },
};
export default latex;
