import type { LanguageDefinition } from "../core/lexer.ts";
const clojure: LanguageDefinition = {
  name: "clojure",
  aliases: ["clj","cljs","cljc","edn"],
  semantic: "generic",
  keywords: ["def","defn","defmacro","defmulti","defmethod","let","loop","recur","if","when","when-not","when-let","when-first","cond","case","do","fn","quote","var","ns","in-ns","require","import","use","try","catch","finally","throw","letfn","binding","with-redefs","declare","defonce","defrecord","defprotocol","deftype","extend-type","extend-protocol","reify","proxy","doseq","dotimes","for","if-let","if-not","when-let","nil","true","false"],
  booleans: ["true","false"],
  nulls: ["nil"],
  operators: ["=>","->","->>","==","=","+","-","*","/","<",">","<=",">=","&","|","!","~","%","^","@","#","'",":","::","~@","~","`",".",".."],
  punctuation: ["(",")","{","}","[","]",";",",","#","'","`","~","@","^","&","|","<",">",".",":","_","\\","$","?","!"],
  lex: { strings: [{open:'"',close:'"',escape:"\\",multiline:false}], comments: [{open:";",close:"\n",line:true},{open:"(comment",close:")"}], regex:false },
};
export default clojure;
