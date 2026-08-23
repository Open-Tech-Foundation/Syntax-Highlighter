import type { LanguageDefinition } from "../core/lexer.ts";
import javascript from "./javascript.ts";

// JSX shares JavaScript semantics but is a distinct language name for pickers.
// Re-export JS definition under the jsx name with generic semantics overridden to javascript.
const jsx: LanguageDefinition = {
  ...javascript,
  name: "jsx",
  aliases: [],
  // Keep javascript semantics so arrow/destructuring/class highlighting works in JSX.
  semantic: "javascript",
};

export default jsx;
