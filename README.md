<div align="center">

# Syntax Highlighter

*An [Open Tech Foundation](https://opentechf.org/) project*
</div>

> ### A JavaScript syntax highlighter built on the CSS Custom Highlight API.
>
> Highlights source code using native `Range` objects and semantic CSS highlights—without modifying the DOM.

## Usage

```sh
pnpm add @opentf/syntax-highlighter
```

Load the bundled theme and highlight an element:

```ts
import "@opentf/syntax-highlighter/themes/default.css";
import { highlightElement } from "@opentf/syntax-highlighter";

const handle = await highlightElement(
  document.querySelector("pre")!,
  'const answer = 42;',
);

handle.refresh('const answer = 43;');
// Call handle.dispose() when the element is removed.
```

`refresh()` coalesces successive calls over 50ms by default; pass
`{ debounceMs }` to change that, or `{ debounceMs: 0 }` to re-highlight
synchronously.

The renderer keeps the source in one text node and registers ranges under the
`sh-*` highlight names. The default stylesheet follows the system color scheme;
set `data-sh-theme="light"` or `data-sh-theme="dark"` on `<html>` to force a
mode. Browsers without the CSS Custom Highlight API still receive the source
text, without semantic colors.

The built-in language is JavaScript. Additional lexical language definitions can
be registered with `registerLanguage()` and loaded by name or alias. Definitions
are validated at runtime so malformed user-provided JSON fails immediately, and
an alias that would take over another language's name is rejected rather than
silently shadowing it.

A definition is classified by its `semantic` field. The default, `generic`,
uses the language's own keyword, boolean, null and constant lists plus two
structural cues shared by most languages — an identifier before `(` is a
function, an identifier after `.` is a property. Only `semantic: "javascript"`
opts into the JavaScript-specific pass (arrows, destructuring, classes,
imports, parameter binding), so a custom language is never highlighted as if it
were JavaScript.

## Development

The project uses the organization-provided `esdev` binary for builds and tests,
and pnpm for workspace dependency management:

```sh
pnpm install
esdev test
pnpm typecheck
pnpm build
```

`@opentf/esrun-types` is a development dependency in each TypeScript workspace
that uses `runtime:*` modules or the DOM/runtime declarations.

## License

Licensed under the [MIT License](LICENSE).

```
Syntax-Highlighter
Copyright 2026 Open Tech Foundation <https://opentechf.org> and contributors
```
