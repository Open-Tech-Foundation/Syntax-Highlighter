import type { LanguageDefinition } from "../core/lexer.ts";
const nginx: LanguageDefinition = {
  name: "nginx",
  aliases: ["nginxconf"],
  semantic: "generic",
  keywords: ["user","worker_processes","error_log","pid","events","http","server","location","listen","server_name","root","index","try_files","proxy_pass","proxy_set_header","upstream","include","default_type","log_format","access_log","sendfile","keepalive_timeout","gzip","ssl","ssl_certificate","ssl_certificate_key","rewrite","return","expires","add_header"],
  operators: ["=","~","~*","^~","="],
  punctuation: ["{","}",";",",","#","@","$","%","&","|","<",">",".","_","~","`","'","\"","\\","?","!","*","+","-","/","%","(",")","[","]"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false},{open:"'",close:"'",escape:"\\",multiline:false}], comments: [{open:"#",close:"\n",line:true}], regex:false },
};
export default nginx;
