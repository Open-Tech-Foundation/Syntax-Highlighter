// Showcase: Typst — programmable typesetting.
#set page(width: 16cm, height: auto, margin: 2cm)
#set text(font: "Inter", size: 11pt, fill: rgb("#182033"))
#set heading(numbering: "1.")

#let badge(text, color: blue) = box(
  fill: color.lighten(80%),
  inset: (x: 8pt, y: 4pt),
  radius: 4pt,
)[#text]

#align(center)[
  #text(size: 24pt, weight: "bold")[Syntax Highlighter]
  #v(4pt)
  #badge("Alpha", color: orange)
]

= Introduction

One *tokenizer* for *browser* highlights, `HTML`, and _ANSI_ output.
See @fig:tokens and https://example.com/docs.

#figure(
  table(
    columns: (1fr, auto),
    [*Language*], [*Tokens*],
    [JavaScript], [120],
    [Python], [85],
  ),
  caption: [Counts by language],
) <fig:tokens>

== Code samples

#let answer = 40 + 2
The answer is #answer, or #(40 + 2) inline.

```js
const x = 1;
```

#for lang in ("js", "py", "rs") [
- #link("https://example.com/" + lang)[#lang]
]

#show link: it => underline(text(fill: blue, it))
#show heading: set text(fill: rgb("#6556c9"))

#lorem(20)
