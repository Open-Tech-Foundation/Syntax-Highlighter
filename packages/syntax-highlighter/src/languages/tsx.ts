import type { LanguageDefinition } from "../core/lexer.ts";
import typescript from "./typescript.ts";

// TypeScript plus JSX elements. Generic arrows must be written `<T,>` or
// `<T extends U>` in .tsx files, which the JSX scanner leaves to TypeScript.
const tsx: LanguageDefinition = {
  ...typescript,
  name: "tsx",
  aliases: [],
  lex: { ...typescript.lex, jsx: true },
};

export default tsx;
