# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added an esdev-scaffolded vanilla demo site under `demo/` that highlights a live code sample from the workspace package.
- Set up a Bun workspace with an `@opentf/syntax-highlighter` package under `packages/`.
- Added AGENTS.md with contribution rules for AI coding agents.
- Converted all sources from JavaScript to TypeScript with strict types, added `tsconfig.json`, and added unit tests for the tokenizer/highlighter.

### Changed

- Rewrote the README in the Open Tech Foundation house style (centered header, tagline, license section).
- Switched the monorepo from a Bun workspace to a pnpm workspace (`pnpm-workspace.yaml`), with root `build`/`test`/`typecheck` scripts fanning out to all packages.
- Switched library bundling to `esdev build --lib src --dts-bundle`: package now publishes `dist/` artifacts (per-module ESM JS, one bundled `index.d.ts`) instead of raw TS source; exports map points at `dist` with a `./themes/*` subpath served from source.
- Adopted the esdev house style: relative imports use `.ts` extensions (rewritten to `.js` by `esdev build --lib`), tests run on `esdev test` via `runtime:test` instead of `node:test`/Bun.
