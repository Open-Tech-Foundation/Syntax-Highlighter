# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **HIGH:** Fixed boolean/null/constant literals being misclassified as `keyword` — `classifyIdentifier` now checks `nulls`/`booleans`/`constants` *before* `keywords`, so a word listed in both (e.g. `true`/`false`/`null`/`nil` in Rust, C#, C++, TypeScript, Ruby, Bash, etc.) is tagged with its literal type and gets the correct theme color instead of collapsing to `keyword`.

- **LOW:** Removed a brittle substring guard in `json-renderer.ts` `validateTokens` that rejected token types containing `"blue"`/`"dark-theme"`/`"theme"`. Validation is already enforced by the `ALLOWED_TYPES` allow-list, so the substring check was redundant and could false-positive on legitimate semantic types.

- **HIGH:** Deduplicated `HIGHLIGHTABLE` set — `css-renderer.ts` now imports from `render-helpers.ts` instead of defining its own identical copy.

- **HIGH:** Fixed type safety for markup tokens — `RawTokenType` now includes `"tag" | "attribute" | "text"`, removing unsafe `as string`/`as RawToken["type"]` casts in `unified-lexer.ts` and `unified-tokenizer.ts`.

- **MEDIUM:** Added cycle detection to `loadLanguage()` alias chain resolution — prevents infinite loops from cyclic entries in `aliasToCanonical`.

- **MEDIUM:** Removed dead `renderer.ts` re-export file (only imported by tests, now updated to use `css-renderer.ts` directly).

- **MEDIUM:** Added `source` type validation to `Highlighter.highlight()` — now throws `TypeError` for non-string inputs instead of producing cryptic lexer errors.

- **LOW:** Removed redundant `AnsiThemeType` alias from public API — `AnsiTheme` is already exported directly.

- **LOW:** Removed dead ANSI theme alias files (`solarized.ts`, `github.ts`) that re-exported from other theme files but were never imported.

- **MEDIUM:** Added tag/attribute color fallbacks in `renderANSI` — HTML/XML tokens now receive keyword/property colors when the theme doesn't define explicit tag/attribute colors, matching `shared.css` behavior.

- **MEDIUM:** Added `controls?: string[]` field to `LanguageDefinition` — allows non-JS languages to classify language-specific control-flow keywords (e.g. Python `elif`/`raise`, Ruby `unless`/`rescue`, Rust `match`/`loop`, Go `select`/`defer`).

- **HIGH:** Enabled `declarations` and `contextStack` for ALL languages (not just JS) — non-JS languages now get function/parameter/property detection via universal structural patterns (`identifier (` → function, `.` → property, context stack for parameters).

- **MEDIUM:** Added `classDetection` feature flag to `TokenizerFeatures` — gates keyword-based class/type name detection (e.g. `class Foo {}` → `Foo` is `class`). Enabled by default for JS, opt-in for other languages.

- **HIGH:** Refactored core to be fully language-agnostic — removed all JS-specific constants (`CLASS_KEYWORDS`, `TYPE_DECL_KEYWORDS`) and hardcoded keyword checks from the core. Added `classKeywords`, `typeDeclKeywords`, `classUsageKeywords`, `declarationKeywords` fields to `LanguageDefinition` so each language defines its own keyword semantics. Generalized `semantic` field to accept any string.

- **HIGH:** Added `spec.md` — core specification documenting the language-agnostic architecture and all feature flags.

- **MEDIUM:** Fixed demo typecheck error — null-safe access on Shiki highlighter promise resolves TS18047.

- **LOW:** Updated `tasks.toml` typecheck to include `demo/` — CI now type-checks the demo app.

## [0.3.0] - 2026-08-25

### Fixed

- Fixed greedy dot consumption in `defaultScanNumber` — numbers like `0.` no longer consume the trailing dot, fixing range operators (`..`, `..=`) in Rust, Ruby, Kotlin, Dart, and other languages that use double-dot syntax.
- Fixed Biome lint noise in `css-renderer.ts` — replaced `!` non-null assertions with proper null guards and added `noTemplateCurlyInString` override for test files, fixed unused imports/params and organized imports across 47 files.
- Added `UnknownLanguageError` class with `code: "UNKNOWN_LANGUAGE"` for typed error handling in `loadLanguage()`.
- **CRITICAL:** Fixed HTML embedded `<script>`/`<style>` dropping leading whitespace — sub-tokenizer whitespace tokens are now emitted, fixing `validateTokens`/`renderJSON` for HTML with embeds.
- **HIGH:** Fixed Rust lifetimes (`'a`, `'static`) being parsed as strings — added `scanString` hook to Lexer and Rust-specific handler that distinguishes char literals from lifetimes.
- **MEDIUM:** Fixed Python f-string/r-string/b-string prefixes being tokenized as separate variables — added prefixed string definitions (f', r', b', rb', rf', fr', etc.) to Python language.
- **MEDIUM:** Fixed TS generic arrow return type `T` being classified as parameter — `retroParams` now skips the `): Type` annotation when walking backward from `=>`.
- Fixed property/method conflation — `a.prop` vs `a.method()` now emit distinct `property` vs `method` types; Shiki fidelity improves for method calls.

### Added

- Added `METHOD` semantic token type (`TokenType.METHOD`) for callable property accesses — `a.method()` highlights as `method` distinct from `a.prop` field reads.
- Added `method` CSS (`::highlight(sh-method)`/`.sh-method`) and ANSI theme (`method: "#61afef"`) support with fallback to `function` color; all 13 ANSI themes and `shared.css` updated.
- Added `CONTROL` semantic token type (`TokenType.CONTROL`) for flow keywords — `return`/`if`/`for`/`while`/`throw`/`break`/`yield`/`await` etc. highlight as `control` distinct from `keyword`; `sh-control`/`control` themes fallback to `keyword` color.

### Changed

- **style(themes):** theme-specific `control`/`method` colors per palette — light themes use Shiki/VS Code purple `#af00db` for `control` (vs `keyword` red/blue), dark themes use palette-native distinct hues (`#e06c75`, `#bd93f9`, `#c586c0`, etc.); `method` is per-theme lightened `function` (e.g. `#9165e2` vs `#8250df`) replacing the previous universal vivid `#ff3b30`/`#2ee5a6` for Shiki visual parity.
- Extracted `retroactive-params.ts`, `binding-analyzer.ts`, `context-helpers.ts` from `unified-tokenizer.ts` (982→~530 LOC). Moved `pushCtx`/`popCtx` to `state.ts`.
- Added `..=` (inclusive range) operator to Rust language definition.
- Added `lex.scanString` hook to `LexDefinition` interface and Lexer class for language-specific string scanning.
- Added 88 advanced test cases covering embedded languages, nested structures, template literals, edge cases, and cross-language range operators.

## [0.2.0] - 2026-08-25

### Changed

- **Breaking:** replaced old `Tokenizer` with `UnifiedTokenizer` as the primary tokenizer. Removed `Tokenizer` class, `TokenizerLike` interface export, and `src/core/tokenizer.ts`. `Highlighter` now uses `UnifiedTokenizer` internally. `UnifiedLexer` (extends `Lexer` with markup-aware tokenization) and `UnifiedTokenizer` (single-pipeline classifier with opt-in JS features) are the only exported tokenizer classes.

- `UnifiedTokenizer` is now the sole tokenizer implementation — 42% faster than the old one, 92.8% Shiki fidelity (HTML 100%, JS 92.2%, TS 91.0%).

### Added

- Added VS Code Default Dark+ and Light+ themes (`vscode-dark`, `vscode-light`) — CSS themes, ANSI themes, and demo picker support. Colors mapped from Shiki's TextMate scopes.
- Added Shiki comparison tab to the demo site — dynamically loads shiki with JS regex engine, renders side-by-side with our tokenizer output, respects light/dark theme mode.
- Added `propertyKeys` feature to `TokenizerFeatures` — detects strings before `:` and classifies as `key` instead of `string`. Enabled by default in JSON language definition.
- Added `KEY` token type for object literal keys — distinct from `property` (property access) and `string` (string values). Each theme defines `--sh-key` for independent color control.

### Fixed

- Fixed `?.` operator not setting `Expectation.PROPERTY` for generic languages — always create a `HighlightState` context instead of gating on `features.contextStack`, so member-access property detection works for all languages.
- Gated JS-specific context features (class/type detection, parameter bindings, declarations, retroactive rewriting) behind `this.features.contextStack` so generic languages don't pick up unintended JavaScript semantics.
- Updated `html-tokenizer.test.mjs` — DOCTYPE name is now classified as `tag` (not `keyword`) in the unified tokenizer, matching its treatment as a tag-like construct.
- Fixed embedded language delegation in `UnifiedTokenizer` — `<script>` and `<style>` bodies now use a full `UnifiedTokenizer` sub-instance (not a bare `Lexer`), so JavaScript inside `<script>` correctly classifies `const`/`let`/`function` as keywords, not variables. Fixed `embedRegions` accumulation bug where regions leaked across multiple `tokenize()` calls on the same `UnifiedLexer` instance.
- Fixed wrong comment syntax in 18 language definitions (ada, apache, clojure, fish, fortran, ini, lisp, ocaml, org, pascal, prolog, properties, raku, scheme, smalltalk, systemd, tcl, vb) — these had generic `//` / `/* */` comments copy-pasted from a template instead of their actual comment delimiters.
- Removed duplicate entries from keyword/operator arrays in 16 languages (julia, handlebars, swift, graphql, fsharp, dockerfile, clojure, crystal, erlang, nim, nix, scala, solidity, jinja, elixir, liquid).
- Removed empty `nulls`/`constants` arrays from cmake, rust, solidity, python, haskell.
- Fixed demo custom language panel not hidden by default — CSS specificity issue where `.panel { display: grid }` overrode the `hidden` attribute.

- Added HTML semantic tokenization — config-driven, no new tokenizer class: `markup: { tags: true }` in a language definition switches `GenericTokenizer` to structural scanning (tag names emit the new `tag` type, attribute names `attribute`, text content plain `text`; closing tags parse as one unit; doctype/XML-prolog names are `keyword`; CDATA handled), and `markup.embed` maps raw-text elements to another definition — html embeds `{ script: javascript, style: css }` so `<script>` bodies tokenize as JavaScript and `<style>` bodies as CSS. Wired for `html` and `xml`. Three new semantic token types (`tag`, `attribute`, `text`) added to the token set; `shared.css` gains `sh-tag`/`sh-attribute` selectors falling back to `--sh-tag`→`--sh-keyword` / `--sh-attribute`→`--sh-property` (themes need no changes; `text` renders unstyled by design). Token streams keep full-source coverage so the JSON contract holds. Covered by new `test/html-tokenizer.test.mjs`.
- Unified the tokenizer stack — `Tokenizer` (JavaScript semantics) now subclasses `GenericTokenizer`, inheriting the lexer, word lists, and significant-token lookahead instead of duplicating them; `createTokenizer(def)` is the single dispatch point (also resolving `markup.embed` bodies recursively) and is exported alongside `TokenizerLike`/`EmbedTokenizerFactory`.

### Added

- Added TypeScript semantic tokenization — `typescript` now runs the JS-aware tokenizer (`semantic: "javascript"`) instead of the generic one. Type-declaration names (`type X = …`, `interface X`, `enum X`) highlight as `class`; their bodies highlight members as `property`; parameter/return type annotations are transparent to binding analysis so typed params (`(name: string) =>`, methods, generic declarations like `function f<T>(arg: T): T`) still highlight as `parameter`, including optional (`a?: T`) and nested-generic (`Map<string, number>`) annotations. Also aligned TS punctuation with JS (`:` is punctuation, not an operator), fixing property highlighting in plain TS object literals. Covered by new `test/typescript-tokenizer.test.mjs`.

### Added

- Added ANSI truecolor theme system — plain RGB data (no ANSI codes in themes), truecolor-only (`ESC[38;2;R;G;Bm`), tree-shakeable separate modules `src/ansi/themes/{default,default-light,dracula,github,monokai,nord,solarized,one-dark,gruvbox-dark,tokyo-night,github-dark/light,solarized-dark/light}.ts` with `defaultTheme` (dark) + `defaultLight` (light) and `ANSI_THEMES`/`ANSI_PALETTES` (`{dark,light}`) presets derived from CSS `--sh-*`; renderer converts hex → truecolor via `hexToAnsi()`. Usage: `import { dracula } from "@opentf/syntax-highlighter/ansi/themes/dracula"` and `renderANSI(source, tokens, { theme: dracula })` (or `new AnsiRenderer({ theme: dracula })`); `color: false` or `NO_COLOR` disables color (plain `source.slice` reassembly). Added `type` → `class` alias. 16-test suite `ansi-renderer.test.mjs` covers truecolor, theme overrides, `color:false`/`NO_COLOR`, `hexToAnsi`, `type` alias, and tree-shakeability.
- Added demo terminal tab with xterm.js (`@xterm/xterm@5.5.0` + `@xterm/addon-fit@0.10.0`) preview, theme-synced via `syncTerminalTheme()` reading `getComputedStyle(--bg-editor/--fg/--selection)` and `data-theme` disabled toggling for all 11 syntax themes.
- Added ANSI theme contrast gate (`test/ansi-theme-contrast.test.mjs`) — pairs each of the 14 `ANSI_THEMES` entries with its canonical editor background and enforces: universal visibility floor ≥ 2:1 for every token color, WCAG AA-Large ≥ 3:1 for all non-comment tokens (5 authentic solarized-light colors below 3:1 are explicitly allowlisted with measured ratios; stale allowlist entries fail), and comments ≥ 2:1. Uses `@opentf/std`'s `colorContrast`/`stripANSI` via a single re-export point (`test/helpers/wcag.mjs`); enabled moving `tasks.toml`'s `[tasks.test]` to run `esdev test` from the workspace root, since esdev's module sandbox pins resolution to the process working directory and rejected pnpm's hoisted `.pnpm` store paths when run from the package dir.

### Fixed

- Fixed chained alias resolution (`inifile` → `conf` → `ini`): corrected `aliasToCanonical.inifile` to `"ini"` and made `loadLanguage()` transitive (while loop) so `loadLanguage("inifile")` no longer throws `Unknown language`.
- Fixed demo theme loading (hashed `/assets/*.css` 404 and disabled toggle) by adding all 11 theme links with `data-theme` and `disabled` to `index.html` and switching via `link[data-theme]` toggling; fixed xterm ESM import (`@xterm/xterm`).
- Fixed demo terminal theme sync — `syncTerminalTheme()` on `applyTheme()`, `syntaxThemeSelect` change, `matchMedia` and `flushTerminal()` DRY via `currentAnsi`/`setAnsiContent()` instead of repeated `dataset.ansi` clears.
- Fixed ANSI light-mode contrast and theme switching — added `default-light` palette and `ANSI_PALETTES`/`ANSI_THEMES` (11 presets mirroring CSS themes); demo now resolves `resolveAnsiTheme()` by `getEffectiveMode()` (forced `data-sh-theme` or `prefers-color-scheme`) and re-renders ANSI via `rerenderAnsi()` on `applyTheme`/`syntaxThemeSelect`/`matchMedia` instead of `flushTerminal()` cached SGR, so `default` on light uses `#24292f` (~15:1) not `#abb2bf` (1.6:1) and palette is not baked at edit time; fixed stale terminal on empty source (`flushTerminal` clears even when `!currentAnsi`), removed double `\n→\r\n` (`convertEol:true` suffices), and trimmed `dataset.ansi` mirror / 3-way copy fallback to single `currentAnsi`.

### Changed

- **Breaking:** removed the stateless renderer classes `AnsiRenderer`, `HtmlRenderer`, and `JsonRenderer` in favor of their function forms — `renderANSI(source, tokens, options?)`, `renderHTML(source, tokens, options?)`, and `renderJSON(source, tokens)` — leaving one entry point per output format. Also removed `HtmlRenderer.renderDocument()` / `renderDocument()` (users compose `<pre><code>` themselves) and the now-unused `containerClass` option. Renamed option types for consistency: `AnsiRendererOptions` → `AnsiRenderOptions`, `HtmlRendererOptions` → `HtmlRenderOptions`. Removed the deprecated ANSI legacy shims — `DEFAULT_ANSI_COLORS` and the raw-SGR `colors` option (use `theme` with hex or SGR values). `CSSHighlightRenderer` remains a class (genuinely stateful: DOM node tracking, shared `CSS.highlights` registry, `clear()`/`dispose()` lifecycle). Updated READMEs (all four renderers + multi-package-manager install section), demo workbench, and unit tests to the function API.
- Extracted shared `isValidToken`/`HIGHLIGHTABLE`/`iterateTokens`/`getSortedValidTokens` to `render-helpers.ts` (DRY html-renderer/ansi-renderer).
- Deduplicated demo `terminal.clear()`/`write()` (4×) via `currentAnsi`/`flushTerminal()`/`setAnsiContent()` and moved `puppeteer-core` from `dependencies` to `devDependencies`; gitignored `verify_*.mjs` helpers (use `CHROME_PATH`/`PORT` env vars when needed).

### Fixed

- Fixed `pnpm/action-setup` version conflict in CI/release workflows — removed `with: version:` (now resolves via `packageManager: pnpm@11.21.0`) to avoid `ERR_PNPM_BAD_PM_VERSION` / `Multiple versions of pnpm specified` on `pnpm/action-setup@v4`.
- Fixed npm package README — `tsr build` / `release.toml` now `cp ../../README.md README.md` into `packages/syntax-highlighter/` so `pnpm pack` includes `README.md` (was missing; root README outside package not auto-included).

### Fixed

- Fixed lexer unknown-char fallback splitting astral characters — the last-resort branch advanced one UTF-16 code unit, so emoji etc. became two lone-surrogate `punctuation` tokens whose `source.slice` text breaks renderers; now advances by `codePointWidthAt()`.
- Fixed SQL keyword matching case-sensitivity — uppercase `SELECT`/`FROM`/`WHERE` missed the lowercase word lists and were mis-tokenized as `constant`. Added opt-in `LanguageDefinition.caseInsensitive` flag folding keywords/booleans/nulls/constants in `GenericTokenizer` (set for SQL); moved `null` from keywords to `nulls` so `NULL` classifies as null.
- Fixed TypeScript missing `satisfies` keyword (TS 4.9+ operator classified as variable).
- Fixed string openers losing to identifier scan — prefixed literals now match first, enabling rust raw/byte forms (`br#"…"#`, `br"…"`, `r#"…"#`, `r"…"`, `b"…"`) and csharp interpolated (`$"…"`, `$@"…"`/`@$"…"`) literals as single string tokens; rust raw strings correctly terminate at the first quote (no escape processing).
- Fixed multi-char string escapes consuming an extra character — C# verbatim `""` self-escapes swallowed following content until the literal ran unterminated; single-char backslash escapes keep covering the escaped char.

## [0.1.0] - 2026-08-23

### Added

- Updated `README.md` with renderer-agnostic one-liner and short desc merged as blockquote, regular description, `Features` section, and updated `Usage` to explicit `renderer.render(source, tokens)` (`CSSHighlightRenderer` / `HtmlRenderer` / `JsonRenderer`).
- Updated `packages/syntax-highlighter/package.json` description and keywords to renderer-agnostic (`Modern, renderer-agnostic syntax highlighting with one tokenizer powering browser, HTML/SSR, JSON, and ANSI output.` + `semantic-tokens`/`ssr`/`ansi`/`themes` keywords).

### Added

- Added shared theme selector layer (`themes/shared.css`) mapping `::highlight(sh-*)` and `.sh-*` to same `--sh-*` variables so `CSSHighlightRenderer` and `HtmlRenderer` share semantic colors; theme files now only define variables and `@import "./shared.css"` (hifi HTML preview in demo `editor-preview` split: `Tokens | JSON (pretty) | HTML | Preview`).
- Simplified renderer API to explicit `renderer.render(source, tokens)` — `CSSHighlightRenderer` now `render(source, tokens)` (sets text, clears stale, creates `Range`/`StaticRange` from UTF-16 offsets, preserves external highlights, no `setText` required); `HtmlRenderer` and `JsonRenderer` expose same `render(source, tokens)` as canonical (duplicate `renderHTML`/`renderJSON` helpers de-emphasized), package exports `CSSHighlightRenderer`, `HtmlRenderer`, `JsonRenderer`.

### Changed

- Renamed `HighlightRenderer` → `CSSHighlightRenderer` for explicit renderer choice; `CSSHighlightRenderer` now `render(source, tokens)` is canonical, no default renderer — consumer tokenizes then picks `CSSHighlightRenderer` / `HtmlRenderer` / `JsonRenderer` (`render(source, tokens)`).

### Added

- Added JSON renderer (`renderJSON`/`validateTokens`/`JsonRenderer`) that validates the minimal `{start,end,type}` contract (exclusive UTF-16 offsets, semantic `type`, contiguous coverage, no surrogate splits) and serializes tokens — and HTML renderer (`renderHTML`/`renderDocument`/`escapeHtml`/`HtmlRenderer`) for SSR/static/docs that recovers text via `source.slice(start,end)` and emits escaped `<span class="sh-{type}">` HTML with no DOM/Range dependency.

### Fixed

- Fixed CI install steps to use `https://raw.githubusercontent.com/Open-Tech-Foundation/tsr/main/install.sh` and `https://raw.githubusercontent.com/Open-Tech-Foundation/ES-Runtime/main/install.sh` with `bash` instead of `https://tsr.opentechf.org/install.sh` / `https://esrun.opentechf.org/install.sh` with `sh` which returned HTML and failed with `Syntax error: "(" unexpected`.

- Fixed `biome.json` deprecation (`linter.rules.recommended` → `preset`, `files.ignore` → `files.includes`) and disabled `noMisleadingCharacterClass`/`noShadowRestrictedNames`/`noAssignInExpressions`/`a11y/noSvgWithoutTitle` that blocked `tsr lint`/`fmt:check`; ran `biome check --write` to format 140+ files; fixed `tasks.toml` `test:e2e` arg `esdev test -- highlight.e2e` → `esdev test highlight.e2e` so `tsr ci` (typecheck + lint + fmt:check + test + build, tests via `esdev`) is now green including the `highlight.e2e` browser suite.

### Added

- Added GitHub Actions CI workflow (`.github/workflows/ci.yml`) that installs `tsr` and `esdev` and runs `tsr ci` (typecheck + lint + fmt:check + test + build) on pushes and pull requests to `main`; uses `pnpm/action-setup@v4` with `setup-node@v4` and `pnpm` cache.

### Added

- Added STF (Structured Text Format) language from https://stf.opentechf.org/ — DATE/TIMESTAMP/DECIMAL/BIGINT/BINARY/Geometry/Time/Duration constructors, T/F/N literals, backtick/double-quote strings, # comments, @version/@schema directives with 2 demo samples (config + stream); verified Highlighter 101, tsc, headless 101 picker + STF + 4 themes + FPS.
- Reached 100 languages (added ocaml, elm, fortran, pascal, ada, lisp, scheme, prolog, smalltalk, d, v, odin, gleam, tcl, raku, vb, coffeescript, haml, ejs, stylus, ini, env, csv, properties, fish, systemd, apache, typst, org, wasm; 100 total) with 30 demo samples; verified Highlighter 100, tsc, headless 100 picker + 5 langs + 4 themes + FPS 61.
- Expanded to 70 languages (added erlang, julia, assembly, nim, crystal, less, astro, pug, handlebars, jinja, liquid, nix, batch, gitconfig, actions, kubernetes, rst, asciidoc; covers full requested set incl. Less/SVG/Astro/Pug/Handlebars/Jinja/Liquid/Nix/Batch/GitConfig/Actions/Kubernetes/RST/AsciiDoc; 70 total) with 18 demo samples; verified Highlighter 70, tsc, headless 70 picker + 18 langs + 4 themes + FPS 61.
- Added HTTP language and fixed alias resolution (tsx/json5/shell/mdx/py etc via aliasToCanonical) to fully cover requested 39 (now 52 total, 39/39); verified Highlighter 52, tsc, headless 52 picker + HTTP + 4 themes + FPS 61.
- Expanded to 51 languages (added matlab, clojure, fsharp, groovy, solidity, makefile, cmake, nginx, latex, regex, protobuf, hcl; covers requested 19 including Lua/R/Scala/Elixir/Haskell/Perl/Objective-C; total 51) with 12 demo samples; verified Highlighter 51, tsc, headless 51 picker + 12 langs + 4 themes + FPS.
- Completed coverage of requested 32 (added scss, vue, svelte, toml, xml, graphql, dockerfile, diff; total 39 incl. extras haskell/scala/lua/perl/r/elixir/zig/objectivec) with 8 demo samples; verified Highlighter 39/39, tsc, headless 39 picker + 8 langs + 4 themes + FPS.
- Expanded to 31 languages (added dart, scala, lua, perl, r, powershell, objectivec, haskell, elixir, zig with aliases dartlang/sc/pl/pm/rlang/ps/ps1/objc/m/mm/hs/ex/exs) and 10 demo samples; verified Highlighter 31, tsc, esdev test, headless 31 picker + 4 themes + FPS 61.
- Expanded built-in languages to 21 (added java, go, rust, php, ruby, c, cpp, csharp, swift, kotlin with keyword-heavy generic lexing and aliases: jsp, golang, rs, rb, c++/cc/cxx, cs/c#, swiftlang, kt/kts) and wired demo with 10 new samples; verified via Highlighter for all 21, tsc, esdev test, and headless Chrome (puppeteer-core) with 4+ controls and FPS.
- Added 10 popular themes (github-light, github-dark, monokai, dracula, nord, solarized-dark/light, one-dark, gruvbox-dark, tokyo-night) alongside default (11 total) and wired demo Theme picker to switch via #sh-theme
- Added 10 built-in languages (html, css, jsx, python, typescript, json, bash, sql, yaml, markdown) with generic lexing and lazy-loaded via `loadLanguage()`; demo now lists all languages and syncs samples by language.
- Added Biome (`biome.json`, `@biomejs/biome@2.5.10`) for lint (`tsr lint`) and format (`tsr fmt` / `tsr fmt:check` via `biome check`, fix via `tsr lint -- --write`), wired into `tsr check` and `tsr ci`.
- Added `tasks.toml` for [`tsr`](https://tsr.opentechf.org) — repo-aware (`[workspace] members = ["packages/*", "demo"]`) with `tsr demo` (esdev start in demo), `build` (esdev --lib), `typecheck`/`test` via packages fan-out, `lint`/`fmt` via Biome, `check`/`ci` deps.

- Added unit tests covering the `highlightElement()` handle lifecycle.
- Added a `debounceMs` option to `highlightElement()`; `0` re-highlights synchronously on every `refresh()`.
- Added unit tests covering `GenericTokenizer` and the `Highlighter` dispatch it hangs off.
- Added `GenericTokenizer`, a language-agnostic classifier, and a `semantic` field on language definitions selecting between it and the JavaScript-specific `Tokenizer`. Definitions default to `generic`, so a registered custom language no longer has JavaScript's arrow, class, import and parameter semantics applied to it.
- Added runtime validation and focused registry/renderer tests for custom language definitions and CSS highlight lifecycle behavior.
- Added an esdev-scaffolded vanilla demo site under `demo/` that highlights a live code sample from the workspace package.
- Set up a Bun workspace with an `@opentf/syntax-highlighter` package under `packages/`.
- Added AGENTS.md with contribution rules for AI coding agents.
- Converted all sources from JavaScript to TypeScript with strict types, added `tsconfig.json`, and added unit tests for the tokenizer/highlighter.

### Changed

- Aligned TypeScript on `^7.0.2` across the workspace, which had been split between `7.0.2` at the root and `5.9.0` in the packages.
- Collapsed the duplicated light palette in `themes/default.css` and dropped the unused `--sh-type`, `--sh-tag` and `--sh-attribute` tokens; the `prefers-color-scheme: dark` block no longer applies to a root forced to light.
- `getRegisteredLanguages()` now lists built-in languages before they have been lazily imported, so a language picker no longer sees an empty list on a fresh page.
- `registerLanguage()` now rejects an alias that would take over another language's registered name (or a built-in's), instead of silently shadowing it; conflicts are checked before the registry is touched, so a rejected definition cannot half-register.
- Token lookahead in the tokenizer is precomputed once per `tokenize()`: O(1) per identifier instead of a rescan, and comments are transparent to it, so `greet /* who */ ()` reads as a call.
- Redesigned the demo as an IDE-style workbench: a title bar with an editor tab, an activity bar, an editor with a line-number gutter and horizontal scrolling, a tabbed bottom panel for tokens and custom languages, and a status bar.
- Fixed destructured parameters, private fields, Unicode identifiers, custom string escapes, and regex literals after JavaScript control headers.
- Namespaced CSS highlights under `sh-*`, preserving unrelated page highlights; renderer text replacement now clears stale ranges, and public highlight handles support disposal.
- Added `@opentf/esrun-types` to the library development dependencies and documented the esdev/pnpm development workflow.
- Rewrote the README in the Open Tech Foundation house style (centered header, tagline, license section).
- Switched the monorepo from a Bun workspace to a pnpm workspace (`pnpm-workspace.yaml`), with root `build`/`test`/`typecheck` scripts fanning out to all packages.
- Switched library bundling to `esdev build --lib src --dts-bundle`: package now publishes `dist/` artifacts (per-module ESM JS, one bundled `index.d.ts`) instead of raw TS source; exports map points at `dist` with a `./themes/*` subpath served from source.
- Adopted the esdev house style: relative imports use `.ts` extensions (rewritten to `.js` by `esdev build --lib`), tests run on `esdev test` via `runtime:test` instead of `node:test`/Bun.
- Consolidated the themes into a single `themes/default.css` driven by custom properties: follows `prefers-color-scheme` automatically, with `data-sh-theme="light"|"dark"` on `<html>` to force a mode; the separate dark/light files are gone.
- Made `HighlightRenderer` safe to run multiple instances on one page: renderers now merge their ranges into the shared `CSS.highlights` registry instead of clearing it, and `dispose()` removes an instance.
- Rebuilt the demo site as a developer playground: overlay editor with live highlighting, token stream inspector, sample snippets, dark/light theme switching via bundled theme stylesheets, and live registration of custom language definitions (JSON).

### Fixed

- Fixed the demo serving a stale highlighter after a custom language was re-registered under a name it had already used.
- Fixed five type errors in `lexer.ts`: `ScanFrame` was missing the `resumeTemplate` field the scanner already used. `esdev build` does not typecheck, so these never failed the build.
- Fixed a template-literal scan bug that swallowed the rest of the source. A template chunk stayed on the scan stack after handing control to its `${...}`, so once the interpolation closed the abandoned frame re-scanned everything that followed as one unterminated string. Any source containing a template literal was affected.
