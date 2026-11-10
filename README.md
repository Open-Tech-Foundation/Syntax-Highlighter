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
* **102 built-in languages** — loaded lazily, so only the languages you highlight are bundled and parsed.
* **Structure-aware highlighting** — CSS (selectors, properties, at-rules), YAML (keys, scalars, anchors), Bash (commands, arguments, expansions), JSX/TSX (tags, components, attributes), and Markdown (CommonMark emphasis, headings, links) are classified by structure, not word lists.
* **Drop-in page highlighting** — `highlightAll()` finds Prism-style `language-*` code blocks and highlights them with the CSS Highlight API or `<span>` markup; unknown languages are skipped, never thrown.
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

### Page highlighting (Prism-style)

`highlightAll` finds every `<code class="language-*">` (or a `language-*` class on an ancestor such as the `<pre>`, as Prism does), loads each language once, and highlights the blocks. You choose how blocks are painted — `mode` is required:

- `"highlight"` — CSS Custom Highlight API; the DOM is left untouched. Paints nothing where the API is unsupported.
- `"html"` — replaces each block's content with escaped `<span class="sh-*">` markup; works in every browser.

```ts
import { highlightAll, supportsHighlightAPI } from "@opentf/syntax-highlighter";
import "@opentf/syntax-highlighter/themes/default.css";

const result = await highlightAll({
  mode: supportsHighlightAPI() ? "highlight" : "html", // your call
  root: document, // optional; where to look
  // selector, defaultLanguage, prefix are optional too
});
result.skipped; // blocks with no or an unknown language, left as they were
result.dispose(); // release "highlight"-mode ranges (e.g. on navigation)
```

Unknown languages are skipped rather than thrown, and re-running on the same blocks replaces their highlighting instead of stacking it.

### HTML / SSR

Emits escaped HTML with semantic `<span class="sh-{type}">` wrappers. Safe for server rendering and static builds — compose your own `<pre><code>` wrapper as needed.

```ts
import { renderHTML } from "@opentf/syntax-highlighter";

const html = renderHTML(source, tokens, {
  prefix: "sh-", // CSS class prefix for token spans
  wrapWhitespace: false, // wrap whitespace tokens too
});
```

For build steps and server rendering, `highlightCode` resolves the language for you and never throws on an unknown one — it returns the escaped code with `language: null`, so the block still renders as plain text:

```ts
import { highlightCode } from "@opentf/syntax-highlighter";

const { html, language } = await highlightCode(code, { language: "tsx" });
const block = `<pre><code class="language-${language ?? "text"}">${html}</code></pre>`;
```

### ANSI terminal

Truecolor output for CLIs and terminals. Themes are plain RGB objects converted to `ESC[38;2;R;G;Bm`; respects `NO_COLOR` unless `color` is explicit. Control characters in the source (ESC, BEL, …) are printed in caret notation (`^[`, `^G`) so untrusted input cannot drive the terminal; pass `allowControlChars: true` for trusted source.

```ts
import { renderANSI } from "@opentf/syntax-highlighter";
import { dracula } from "@opentf/syntax-highlighter/ansi/themes/dracula";

const out = renderANSI(source, tokens, {
  theme: dracula, // hex colors per token type; defaults to defaultTheme
  color: true, // force on/off; undefined respects NO_COLOR
  wrapWhitespace: false,
  allowControlChars: false, // true writes control characters through (trusted source only)
});
console.log(out);
```

Available ANSI themes: `dark-plus`, `default`, `default-light`, `dracula`, `github-dark`, `github-light`, `gruvbox-dark`, `light-plus`, `monokai`, `nord`, `one-dark`, `solarized-dark`, `solarized-light`, `tokyo-night`, `vscode-dark`, `vscode-light` — importable via `@opentf/syntax-highlighter/ansi/themes/{name}` or as a map from `ANSI_THEMES`.

Aliases: `github` (→ `github-dark`), `solarized` (→ `solarized-dark`).

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

## Accuracy

Highlighting is measured against [Shiki](https://shiki.style)'s TextMate grammars — the grammars VS Code uses — with `bench/accuracy.ts`. Every non-whitespace character is compared after both sides are mapped to the color classes themes render consistently (comment, string, number, keyword, function, type, constant, tag, attribute, property, plus diff and markup classes); identifiers, parameters, operators, and punctuation count as plain. Because characters are compared rather than tokens, differing token boundaries cannot hide a mismatch.

Two numbers are reported per language:

- **Highlighted** — agreement on characters either side colors. This is the strict figure and the target metric.
- **Overall** — agreement on all non-whitespace characters, including text both sides leave plain.

Two corpora are scored separately: **real-world** — pinned, unmodified files from well-known open-source projects ([`bench/corpus/real-world`](https://github.com/Open-Tech-Foundation/Syntax-Highlighter/blob/main/bench/corpus/real-world/README.md)) — and **showcase**, the samples in `website/public/samples` written for this project.

Tier-1 languages are the 18 most common in docs, server rendering, and terminals; the target is 90% highlighted on the real-world corpus. Scores as of 2026-11-10 (Shiki 4.4.3, theme `github-dark`) — the baseline file below is authoritative:

| Language | Real-world highlighted | Real-world overall | Showcase highlighted |
|----------|-----------------------:|-------------------:|---------------------:|
| css | 100.0% | 100.0% | 97.9% |
| json | 100.0% | 100.0% | 99.9% |
| yaml | 100.0% | 100.0% | 100.0% |
| python | 97.0% | 97.9% | 80.3% |
| jsx | 95.2% | 96.6% | 94.4% |
| bash | 94.7% | 96.0% | 90.5% |
| javascript | 94.0% | 95.3% | 90.2% |
| html | 92.2% | 95.6% | 98.0% |
| java | 89.3% | 90.4% | 62.0% |
| typescript | 88.4% | 92.2% | 72.7% |
| c | 87.0% | 90.6% | 61.4% |
| go | 86.6% | 89.0% | 70.2% |
| rust | 84.0% | 88.8% | 69.2% |
| cpp | 82.4% | 88.4% | 62.0% |
| diff | 72.4% | 81.1% | 81.0% |
| csharp | 66.6% | 78.3% | 74.4% |
| markdown | 66.6% | 81.4% | 52.2% |
| sql | 61.5% | 69.5% | 74.2% |

Totals: tier-1 real-world **83.6%** highlighted / 87.7% overall; tier-1 showcase 79.1% / 86.1%; all 99 scorable showcase languages 58.7% / 73.3% (`ejs` and `stf` have no Shiki grammar, and `tsx` has no showcase sample yet).

Reading the numbers:

- Shiki is a reference, not ground truth. Where the two disagree on purpose, ours is kept — for example YAML `on:` is a key (Shiki scores it a boolean) and CSS media features such as `prefers-reduced-motion` are properties.
- Markdown's gap is mostly representational: Shiki colors a link's text, brackets, and URL separately, while one link color is used for the whole `[text](url)` here.
- The weakest tier-1 languages today are SQL, C#, and Diff; non-tier-1 languages are best effort.

Reproduce or investigate:

```sh
tsr bench:accuracy                          # print the per-language table; rewrite bench/accuracy-baseline.json
tsr accuracy:check                          # fail if any language drops below the baseline (part of tsr ci)
esdev bench/accuracy.ts --explain=markdown  # list each mismatch with Shiki's scope chain and our token type
```

The committed [`bench/accuracy-baseline.json`](https://github.com/Open-Tech-Foundation/Syntax-Highlighter/blob/main/bench/accuracy-baseline.json) holds the current per-language scores; CI fails if any language regresses, so improvements are kept.

## API Reference

### Functions

| Export | Description |
|--------|-------------|
| `createHighlighter(options?)` | Creates a `Highlighter` instance. Loads the language definition asynchronously. Returns `Promise<Highlighter>`. |
| `highlightElement(element, source, options?)` | One-shot setup for browser highlighting. Returns `Promise<HighlightHandle>` with `refresh()` and `dispose()`. |
| `highlightAll({ mode, root?, selector?, defaultLanguage?, prefix? })` | Highlights every matching code block. `mode` (`"highlight"` or `"html"`) is required. Returns `Promise<HighlightAllResult>` with `highlighted`, `skipped`, and `dispose()`. |
| `highlightCode(code, { language?, prefix? })` | Code string → escaped span HTML. Unknown or missing language → escaped plain text with `language: null`. Returns `Promise<HighlightCodeResult>`. |
| `supportsHighlightAPI()` | Whether the CSS Custom Highlight API is available. |
| `languageOf(element)` | The `language-*`/`lang-*` class on an element or its nearest ancestor, or `null`. |
| `renderHTML(source, tokens, options?)` | Returns escaped HTML string with `<span class="sh-{type}">` wrappers. |
| `renderANSI(source, tokens, options?)` | Returns ANSI truecolor string for terminal output. |
| `renderJSON(source, tokens)` | Returns JSON string of the token stream. |
| `validateTokens(source, tokens)` | Validates token offsets against the source. Throws `TypeError`/`RangeError`/`Error` on invalid tokens; returns `void` when valid. |
| `hexToAnsi(hex)` | Converts `"#rrggbb"` hex color to ANSI truecolor SGR escape sequence. |
| `registerLanguage(def)` | Registers a `LanguageDefinition` for use with `createHighlighter`. |
| `getRegisteredLanguages()` | Returns array of registered language names. |
| `loadLanguage(name)` | Loads a language definition by name. Returns `Promise<LanguageDefinition>`. |
| `createToken(type, start, end)` | Creates a `Token` object. |
| `isSignificant(token)` | Returns `true` if the token is not whitespace. |

### Classes

#### `Highlighter`

The main entry point. Wraps a `UnifiedTokenizer` and exposes a `highlight()` method.

```ts
const highlighter = await createHighlighter({ language: "javascript" });
const tokens: Token[] = highlighter.highlight(source);
```

- `highlighter.language` — the `LanguageDefinition` used.
- `highlighter.tokenizer` — the underlying `UnifiedTokenizer`.

#### `CSSHighlightRenderer`

Browser renderer using CSS Custom Highlights API.

```ts
const renderer = new CSSHighlightRenderer(element);
renderer.render(source, tokens);
renderer.clear();
renderer.dispose();
```

#### `UnifiedTokenizer`

The core tokenizer. Classifies raw tokens into semantic types. Used internally by `Highlighter`.

```ts
import { UnifiedTokenizer } from "@opentf/syntax-highlighter";

const tokenizer = new UnifiedTokenizer(definition);
const tokens = tokenizer.tokenize(source);
```

#### `UnifiedLexer`

Extends `Lexer` with markup-aware tokenization for HTML/XML. Used internally by `UnifiedTokenizer`.

#### `Lexer`

Base lexer that scans source into raw tokens (identifiers, strings, numbers, comments, operators, punctuation).

### Constants

| Export | Description |
|--------|-------------|
| `TokenType` | Frozen object mapping token type names to their string values (e.g., `TokenType.KEYWORD === "keyword"`). |
| `WHITESPACE` | The string `"whitespace"` — used as a token type for whitespace. |
| `ANSI_THEMES` | Map of all built-in ANSI themes keyed by name. |
| `ANSI_PALETTES` | `{ dark, light }` pair for auto light/dark switching. |
| `ANSI_RESET` | `"\x1b[0m"` — ANSI reset escape sequence. |
| `defaultTheme` | Default dark ANSI theme (one-dark-ish). |
| `defaultLight` | Default light ANSI theme. |

### Types

| Export | Description |
|--------|-------------|
| `Token` | `{ type: TokenType \| "whitespace"; start: number; end: number }` — a semantic token with UTF-16 offsets. |
| `TokenType` | Union of all token type strings: `"keyword" \| "identifier" \| "function" \| "class" \| "parameter" \| "property" \| "key" \| "variable" \| "constant" \| "number" \| "string" \| "comment" \| "regex" \| "operator" \| "punctuation" \| "decorator" \| "boolean" \| "null" \| "tag" \| "attribute" \| "text"`. |
| `LanguageDefinition` | Language configuration object. See below. |
| `TokenizerFeatures` | Opt-in tokenizer features. See below. |
| `AnsiTheme` | ANSI theme object mapping token types to hex colors. |
| `AnsiThemeName` | Union of all built-in theme names. |
| `AnsiRenderOptions` | Options for `renderANSI()`. |
| `HtmlRenderOptions` | Options for `renderHTML()`. |
| `HighlightOptions` | Options for `createHighlighter()` and `highlightElement()`. |
| `HighlightHandle` | Return type of `highlightElement()`. |
| `CommentDef` | `{ open: string; close: string; line?: boolean }` — comment definition. |
| `StringDef` | `{ open: string; close: string; escape?: string; multiline?: boolean; template?: boolean }` — string definition. |
| `LexDefinition` | Lexer configuration (strings, comments, operators, punctuation, regex, etc.). |
| `RawToken` | Token emitted by the lexer before semantic classification. |

### `LanguageDefinition`

```ts
interface LanguageDefinition {
  name: string;           // Language name (e.g., "javascript")
  aliases?: string[];     // Alternative names (e.g., ["js"])
  keywords?: string[];    // Keywords (e.g., ["const", "let", "function"])
  booleans?: string[];    // Boolean literals (e.g., ["true", "false"])
  nulls?: string[];       // Null literals (e.g., ["null", "undefined"])
  constants?: string[];   // Built-in constants (e.g., ["Infinity", "NaN"])
  regexKeywords?: string[]; // Keywords matched via regex
  operators?: string[];   // Operator strings (e.g., ["==", "!=", "=>"])
  punctuation?: string[]; // Punctuation (e.g., ["(", ")", "{", "}"])
  semantic?: "javascript" | "generic"; // Tokenizer mode
  caseInsensitive?: boolean; // Match keywords ignoring case (e.g., SQL)
  lex?: LexDefinition;    // Lexer config (strings, comments, identifiers)
  markup?: MarkupConfig;  // HTML/XML tokenization config
  features?: TokenizerFeatures; // Opt-in tokenizer features
}
```

### `TokenizerFeatures`

Opt-in semantic features for the unified tokenizer. `contextStack` and `declarations` default to `true`; all other flags default to `false` unless set in the language definition's `features` field.

```ts
interface TokenizerFeatures {
  parameterBindings?: boolean;          // Track parameter bindings
  contextStack?: boolean;               // Track scopes (blocks, functions, classes)
  declarations?: boolean;               // Register declarations for hoisted lookup
  retroactiveRewrite?: boolean;         // Retroactive token rewriting for arrows
  typeAnnotationAware?: boolean;        // Skip type annotations in parameter analysis
  propertyKeys?: boolean;               // Detect string keys before `:` as `property`
  classDetection?: boolean;             // Detect class/type names from keyword patterns
  lineBreakResetsExpectation?: boolean; // Clear pending property expectation at line end
  styleSheet?: boolean;                 // CSS structure: selectors, declarations, at-rules
  yamlStructure?: boolean;              // YAML structure: keys, scalars, anchors, block scalars
  shellStructure?: boolean;             // Shell structure: commands, arguments, options, expansions
}
```

## Development

The project uses the organization-provided `esdev` binary for builds and tests,
and pnpm for workspace dependency management. [`tsr`](https://tsr.opentechf.org)
wraps them into a single interface — `tasks.toml` is the workspace root:

```sh
pnpm install

# via tsr (recommended) — run from anywhere in the repo
tsr demo           # demo workbench (esdev start in demo/)
tsr dev:website    # documentation site on AFW (esdev start in website/)
tsr build:website  # library + site production build → website/dist/
tsr test           # library unit tests
tsr test:all       # all workspaces
tsr typecheck      # tsc --noEmit across workspaces
tsr lint           # biome lint (fix: tsr lint -- --write)
tsr fmt            # biome format --write
tsr build          # library → packages/syntax-highlighter/dist/
tsr bench:accuracy # accuracy vs Shiki per language; rewrites bench/accuracy-baseline.json
tsr accuracy:check # fail if any language drops below the committed baseline
tsr test:bench     # unit tests for the accuracy scorer
tsr typecheck:bench # tsc --noEmit for the accuracy harness
tsr bench          # throughput vs other highlighters → website/app/bench-data.js
tsr ci             # typecheck + lint + fmt:check + tests + accuracy:check + build
tsr clean          # rm -rf dist/

# no package.json scripts — tsr is the entry point
```

`@opentf/esrun-types` is a development dependency in each TypeScript workspace
that uses `runtime:*` modules or the DOM/runtime declarations.

The website (`website/`) is built with [AFW](https://afw.opentechf.org) and is its
own pnpm project rather than a workspace member, because esdev loads plugins only
from inside a project root. It installs the library from this checkout
(`file:../packages/syntax-highlighter`), so build the library first. Cloudflare
Workers Builds deploys it with `scripts/build-site.sh` (root directory `website`,
deploy command `npx wrangler deploy`).

## License

Licensed under the [MIT License](LICENSE).

```
Syntax-Highlighter
Copyright 2026 Open Tech Foundation <https://opentechf.org> and contributors
```
