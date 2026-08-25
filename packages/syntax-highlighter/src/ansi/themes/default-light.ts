import type { AnsiTheme } from "./types.ts";

export const defaultLight: AnsiTheme = {
  comment: "#6e7781",
  keyword: "#cf222e",
  string: "#0a3069",
  number: "#0550ae",
  regex: "#116329",
  function: "#8250df",
  class: "#953800",
  variable: "#24292f",
  identifier: "#24292f",
  constant: "#0550ae",
  property: "#116329",
  method: "#8250df",
  key: "#0550ae",
  parameter: "#953800",
  operator: "#0550ae",
  punctuation: "#24292f",
  decorator: "#953800",
  boolean: "#0550ae",
  null: "#0550ae",
};

export const theme: AnsiTheme = defaultLight;
export const defaultLightTheme: AnsiTheme = defaultLight;

export default defaultLight;
