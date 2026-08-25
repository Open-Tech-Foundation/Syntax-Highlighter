import type { AnsiTheme } from "./types.ts";

export const defaultTheme: AnsiTheme = {
  comment: "#7f848e",
  keyword: "#c678dd",
  string: "#98c379",
  number: "#d19a66",
  regex: "#56b6c2",
  function: "#61afef",
  class: "#e5c07b",
  variable: "#abb2bf",
  identifier: "#abb2bf",
  constant: "#d19a66",
  property: "#e06c75",
  method: "#61afef",
  key: "#79c0ff",
  parameter: "#d19a66",
  operator: "#56b6c2",
  punctuation: "#abb2bf",
  decorator: "#d19a66",
  boolean: "#d19a66",
  null: "#d19a66",
};

// keep `theme` and alias for convenience
export const theme: AnsiTheme = defaultTheme;
export const default_: AnsiTheme = defaultTheme;

export default defaultTheme;
