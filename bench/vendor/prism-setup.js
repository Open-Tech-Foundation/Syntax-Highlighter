import Prism from "prismjs/prism.js";

// Prism language components reference a bare `Prism` global (UMD style).
// Provide it before any component module evaluates.
globalThis.Prism = Prism;

export { Prism };
