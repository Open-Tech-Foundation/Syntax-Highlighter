<div align="center">

# Syntax Highlighter

*An [Open Tech Foundation](https://opentechf.org/) project*

*Modern, renderer-agnostic syntax highlighting with one tokenizer*

</div>

>  A fast, renderer-agnostic syntax highlighting library with semantic tokenization and support for CSS Custom Highlights, HTML/SSR, JSON, and ANSI terminal output.

A modern syntax highlighting library that separates tokenization from rendering. A single semantic tokenizer produces renderer-agnostic token ranges that can power native browser highlighting, HTML/SSR output, JSON tooling, ANSI terminal output, and future custom renderers.

## Features

* **Renderer-agnostic architecture** — one semantic tokenizer powers multiple output targets.
* **Native browser highlighting** — uses the CSS Custom Highlight API without injecting token `<span>` elements into the DOM.
* **SSR & static HTML** — render highlighted code to HTML for Next.js, Nextra, documentation sites, and static builds.
* **ANSI terminal output** — generate syntax-highlighted output for terminals and CLI tooling.
* **JSON token output** — inspect, test, serialize, and consume the semantic token stream.
* **Extensible language support** — register languages and aliases without coupling them to renderers.
* **Semantic tokens** — tokens use stable semantic types such as `keyword`, `string`, `function`, `number`, `comment`, and `operator`.
* **UTF-16 range-based tokens** — precise `start`/`end` offsets make tokens directly consumable by different renderers.
* **Themeable** — shared semantic themes work across browser and HTML renderers.
* **Efficient updates** — designed for repeated highlighting and dynamic code content without rebuilding large DOM trees.
* **Composable renderers** — add custom renderers without changing the tokenizer or language definitions.

## Usage

```sh
pnpm add @opentf/syntax-highlighter
```

```ts
import "@opentf/syntax-highlighter/themes/default.css";
import { createHighlighter, CSSHighlightRenderer, HtmlRenderer, JsonRenderer } from "@opentf/syntax-highlighter";

const highlighter = await createHighlighter({ language: "javascript" });
const tokens = highlighter.highlight(source);

// Browser — CSS Custom Highlights
const css = new CSSHighlightRenderer(element);
css.render(source, tokens);

// SSR / static HTML
const html = new HtmlRenderer().render(source, tokens);

// JSON / tooling
const json = new JsonRenderer().render(source, tokens);
```

`CSSHighlightRenderer.render(source, tokens)` sets the text, clears stale `sh-*` highlights, and registers `Range`/`StaticRange` objects from UTF-16 offsets. Themes style both `::highlight(sh-*)` and `.sh-*` via `themes/shared.css` variables (`--sh-keyword` etc.); set `data-sh-theme="light"` or `"dark"` on `<html>` to force a mode.

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
and pnpm for workspace dependency management. [`tsr`](https://tsr.opentechf.org)
wraps them into a single interface — `tasks.toml` is the workspace root:

```sh
pnpm install

# via tsr (recommended) — run from anywhere in the repo
tsr demo           # demo workbench (esdev start in demo/)
tsr test           # library unit tests
tsr test:all       # all workspaces
tsr typecheck      # tsc --noEmit across workspaces
tsr lint           # biome lint (fix: tsr lint -- --write)
tsr fmt            # biome format --write
tsr build          # library → packages/syntax-highlighter/dist/
tsr ci             # typecheck + lint + fmt:check + test:all + build
tsr clean          # rm -rf dist/

# no package.json scripts — tsr is the entry point
```

`@opentf/esrun-types` is a development dependency in each TypeScript workspace
that uses `runtime:*` modules or the DOM/runtime declarations.

## License

Licensed under the [MIT License](LICENSE).

```
Syntax-Highlighter
Copyright 2026 Open Tech Foundation <https://opentechf.org> and contributors
```
