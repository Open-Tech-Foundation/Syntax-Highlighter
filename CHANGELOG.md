# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added unit tests covering `GenericTokenizer` and the `Highlighter` dispatch it hangs off.
- Added `GenericTokenizer`, a language-agnostic classifier, and a `semantic` field on language definitions selecting between it and the JavaScript-specific `Tokenizer`. Definitions default to `generic`, so a registered custom language no longer has JavaScript's arrow, class, import and parameter semantics applied to it.
- Added runtime validation and focused registry/renderer tests for custom language definitions and CSS highlight lifecycle behavior.
- Added an esdev-scaffolded vanilla demo site under `demo/` that highlights a live code sample from the workspace package.
- Set up a Bun workspace with an `@opentf/syntax-highlighter` package under `packages/`.
- Added AGENTS.md with contribution rules for AI coding agents.
- Converted all sources from JavaScript to TypeScript with strict types, added `tsconfig.json`, and added unit tests for the tokenizer/highlighter.

### Changed

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

- Fixed five type errors in `lexer.ts`: `ScanFrame` was missing the `resumeTemplate` field the scanner already used. `esdev build` does not typecheck, so these never failed the build.
- Fixed a template-literal scan bug that swallowed the rest of the source. A template chunk stayed on the scan stack after handing control to its `${...}`, so once the interpolation closed the abandoned frame re-scanned everything that followed as one unterminated string. Any source containing a template literal was affected.
