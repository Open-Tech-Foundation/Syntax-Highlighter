import type { LanguageDefinition } from "../core/lexer.ts";
import javascript from "./javascript.ts";

// JavaScript plus JSX elements: tags, attributes, text children, and `{…}`
// expression containers. Component names (`Card`) are classified as `class`.
const jsx: LanguageDefinition = {
  ...javascript,
  name: "jsx",
  aliases: [],
  // Keep javascript semantics so arrow/destructuring/class highlighting works in JSX.
  semantic: "javascript",
  lex: { ...javascript.lex, jsx: true },
};

export default jsx;
