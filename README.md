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

Available ANSI themes: `default`, `default-light`, `dracula`, `github-dark`, `github-light`, `gruvbox-dark`, `monokai`, `nord`, `one-dark`, `solarized-dark`, `solarized-light`, `tokyo-night`, `vscode-dark`, `vscode-light` — importable via `@opentf/syntax-highlighter/ansi/themes/{name}` or as a map from `ANSI_THEMES`.

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

## API Reference

### Functions

| Export | Description |
|--------|-------------|
| `createHighlighter(options?)` | Creates a `Highlighter` instance. Loads the language definition asynchronously. Returns `Promise<Highlighter>`. |
| `highlightElement(element, source, options?)` | One-shot setup for browser highlighting. Returns `Promise<HighlightHandle>` with `refresh()` and `dispose()`. |
| `renderHTML(source, tokens, options?)` | Returns escaped HTML string with `<span class="sh-{type}">` wrappers. |
| `renderANSI(source, tokens, options?)` | Returns ANSI truecolor string for terminal output. |
| `renderJSON(source, tokens)` | Returns JSON string of the token stream. |
| `validateTokens(source, tokens)` | Validates token offsets against source length. Returns `{ valid: boolean; errors: string[] }`. |
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
| `TokenType` | Union of all token type strings: `"keyword" \| "identifier" \| "function" \| "class" \| "parameter" \| "property" \| "variable" \| "constant" \| "number" \| "string" \| "comment" \| "regex" \| "operator" \| "punctuation" \| "decorator" \| "boolean" \| "null" \| "tag" \| "attribute" \| "text"`. |
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

Opt-in semantic features for the unified tokenizer. When `semantic` is `"javascript"`, all features default to `true`. Otherwise all default to `false`.

```ts
interface TokenizerFeatures {
  parameterBindings?: boolean;   // Track parameter bindings
  contextStack?: boolean;        // Track scopes (blocks, functions, classes)
  declarations?: boolean;        // Register declarations for hoisted lookup
  retroactiveRewrite?: boolean;  // Retroactive token rewriting for arrows
  typeAnnotationAware?: boolean; // Skip type annotations in parameter analysis
  propertyKeys?: boolean;        // Detect string keys before `:` as `property`
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
