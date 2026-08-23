import type { LanguageDefinition } from "../core/lexer.ts";
const makefile: LanguageDefinition = {
  name: "makefile",
  aliases: ["make","mk","mak","gnumake"],
  semantic: "generic",
  keywords: ["include","define","endef","ifdef","ifndef","ifeq","ifneq","else","endif","override","export","unexport","private","vpath",".PHONY",".SUFFIXES",".DEFAULT",".PRECIOUS",".INTERMEDIATE",".SECONDARY",".SECONDEXPANSION",".DELETE_ON_ERROR",".IGNORE",".LOW_RESOLUTION_TIME",".SILENT",".EXPORT_ALL_VARIABLES",".NOTPARALLEL",".ONESHELL",".POSIX"],
  operators: [":", "::", "=", ":=", "::=", "?=", "+=", "!=","==","|","||","&","&&",";","$","@","<",">","^","-","_","+","*","/","%","!","~","#","?",".",","],
  punctuation: ["(",")","{","}","[","]",";",",","#","@","$","%","&","|","<",">",".",":","_","~","`","'","\"","\\","?","!","*","+","-","/","%"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true}], regex:false },
};
export default makefile;
