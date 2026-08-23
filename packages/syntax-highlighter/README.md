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
