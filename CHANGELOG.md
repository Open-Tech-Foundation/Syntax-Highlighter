# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
