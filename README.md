<div align="center">

# Syntax Highlighter

*An [Open Tech Foundation](https://opentechf.org/) project*

*Modern, renderer-agnostic syntax highlighting with one tokenizer*

</div>

>  A fast, renderer-agnostic syntax highlighting library with semantic tokenization and support for CSS Custom Highlights, HTML/SSR, JSON, and ANSI terminal output.

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

## Install

```sh
npm install @opentf/syntax-highlighter
```

```sh
pnpm add @opentf/syntax-highlighter
```

```sh
yarn add @opentf/syntax-highlighter
```

```sh
bun add @opentf/syntax-highlighter
```

```sh
deno add npm:@opentf/syntax-highlighter
```

## Usage

Every renderer takes the same inputs — `source` plus the token array from `highlighter.highlight()`:

```ts
import { createHighlighter } from "@opentf/syntax-highlighter";

const highlighter = await createHighlighter({ language: "javascript" });
const tokens = highlighter.highlight(source);
```

### Browser — CSS Custom Highlights

Highlights the element's text natively via `CSS.highlights` — no `<span>` elements are injected. Requires a theme stylesheet that targets the `sh-{type}` classes.

```css
@import "@opentf/syntax-highlighter/themes/default.css";
```

```ts
import { CSSHighlightRenderer, highlightElement } from "@opentf/syntax-highlighter";

// One-shot setup for an editable/live element:
const handle = await highlightElement(element, source, {
  language: "javascript",
  debounceMs: 50, // refresh() coalescing; 0 = synchronous
});
handle.refresh(nextSource); // re-highlight new content (debounced)
handle.dispose(); // release highlights

// Or drive it manually:
const renderer = new CSSHighlightRenderer(element);
renderer.render(source, tokens);
renderer.clear();
renderer.dispose();
```

### HTML / SSR

Emits escaped HTML with semantic `<span class="sh-{type}">` wrappers. Safe for server rendering and static builds — compose your own `<pre><code>` wrapper as needed.

```ts
import { renderHTML } from "@opentf/syntax-highlighter";

const html = renderHTML(source, tokens, {
  prefix: "sh-", // CSS class prefix for token spans
  wrapWhitespace: false, // wrap whitespace tokens too
});
```

### ANSI terminal

Truecolor output for CLIs and terminals. Themes are plain RGB objects converted to `ESC[38;2;R;G;Bm`; respects `NO_COLOR` unless `color` is explicit.

```ts
import { renderANSI } from "@opentf/syntax-highlighter";
import { dracula } from "@opentf/syntax-highlighter/ansi/themes/dracula";

const out = renderANSI(source, tokens, {
  theme: dracula, // hex colors per token type; defaults to defaultTheme
  color: true, // force on/off; undefined respects NO_COLOR
  wrapWhitespace: false,
});
console.log(out);
```

Available ANSI themes: `default`, `default-light`, `dracula`, `github-dark`, `github-light`, `gruvbox-dark`, `monokai`, `nord`, `one-dark`, `solarized-dark`, `solarized-light`, `tokyo-night` — importable via `@opentf/syntax-highlighter/ansi/themes/{name}` or as a map from `ANSI_THEMES`.

### JSON / tooling

Serializes the token stream — useful for snapshots, tests, and editor integrations.

```ts
import { renderJSON } from "@opentf/syntax-highlighter";

const json = renderJSON(source, tokens);
```

### Custom languages

Register additional languages or aliases without touching the tokenizer or renderers:

```ts
import { registerLanguage, getRegisteredLanguages } from "@opentf/syntax-highlighter";

registerLanguage(definition); // LanguageDefinition
console.log(getRegisteredLanguages()); // ["javascript", "typescript", ...]
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
