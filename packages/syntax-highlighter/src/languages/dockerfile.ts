import type { LanguageDefinition } from "../core/lexer.ts";
const dockerfile: LanguageDefinition = {
  name: "dockerfile",
  aliases: ["docker"],
  semantic: "generic",
  keywords: ["FROM","RUN","CMD","LABEL","MAINTAINER","EXPOSE","ENV","ADD","COPY","ENTRYPOINT","VOLUME","USER","WORKDIR","ARG","ONBUILD","STOPSIGNAL","HEALTHCHECK","SHELL","AS","FROM"],
  operators: ["=","==","!="],
  punctuation: ["[","]","(",")","{","}",";",",","#","@","$","&","|","<",">","/","\\",":","-","_","."],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true}], regex:false },
};
export default dockerfile;
