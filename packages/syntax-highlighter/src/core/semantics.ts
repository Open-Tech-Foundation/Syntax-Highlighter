/**
 * Central semantic registry — grouped namespaces for language-agnostic semantics.
 *
 * These are semantic identities, not CSS/style information.
 * Languages attach these to raw tokens; renderers consume them.
 */
export const semantics = {
  text: {
    bold: "text.bold",
    boldItalic: "text.bold-italic",
    italic: "text.italic",
    underline: "text.underline",
    strikethrough: "text.strikethrough",
  },
  code: {
    inline: "code.inline",
    block: "code.block",
  },
  markup: {
    heading: "markup.heading",
    quote: "markup.quote",
    list: "markup.list",
    link: "markup.link",
    image: "markup.image",
  },
  syntax: {
    delimiter: "syntax.delimiter",
    marker: "syntax.marker",
    escape: "syntax.escape",
  },
} as const;

/**
 * Recursive type extractor — derives a union of all leaf string values
 * from the semantics object.
 */
type LeafValues<T> = T extends string ? T : { [K in keyof T]: LeafValues<T[K]> }[keyof T];

export type Semantic = LeafValues<typeof semantics>;
