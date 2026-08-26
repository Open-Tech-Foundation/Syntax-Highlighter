# Syntax Highlighter — Core Specification

## Principle

**The core tokenizer and classifier are language- and format-agnostic.** They match
and highlight semantic patterns only — never language-specific keywords, syntax, or
grammar rules.

## Architecture

```
LanguageDefinition          Core (agnostic)           Output
┌─────────────────┐       ┌──────────────────┐      ┌──────────┐
│ keywords        │──────▶│ lexer            │─────▶│ Token[]  │
│ classKeywords   │       │ unified-lexer    │      │          │
│ typeDeclKeywords│       │ unified-tokenizer│      │          │
│ classUsageKey...│       │ context-helpers  │      │          │
│ declarationKey..│       │ state            │      │          │
│ features        │       │ renderers        │      │          │
└─────────────────┘       └──────────────────┘      └──────────┘
```

All language-specific knowledge lives in the `LanguageDefinition`. The core reads
data from it and applies generic pattern matching. No `if (language === "x")`
branches exist in the core.

## How it works

1. **Lexer** — Scans source into raw tokens (identifiers, strings, numbers,
   comments, operators, punctuation). Purely character-level, no language knowledge.

2. **UnifiedLexer** — Extends the lexer with markup-aware scanning (tags,
   attributes, text) when `markup.tags` is set. Still no language-specific code.

3. **UnifiedTokenizer** — Classifies raw tokens into semantic types using
   data-driven rules:
   - Word lists (keywords, booleans, nulls, constants) from the language definition
   - Structural patterns: `identifier (` → function, `.` → property
   - Context stack: tracks scopes for parameter/property detection
   - Declaration keywords: maps keywords to expectation types (e.g., `function` → function name, `class` → class name)
   - Class usage keywords: detects class names after `new`/`extends`/`instanceof`
   - Type declaration keywords: detects type names after `interface`/`enum`/`type`

4. **Renderers** — Convert tokens to output format (CSS highlights, HTML, ANSI, JSON).
   Purely data-driven, no language knowledge.

## LanguageDefinition fields (semantic-related)

| Field | Type | Purpose |
|-------|------|---------|
| `classKeywords` | `string[]` | Keywords that introduce class-like declarations (`class`, `struct`, `enum`, `trait`, etc.) |
| `typeDeclKeywords` | `string[]` | Keywords that introduce type declarations (`interface`, `enum`, `type`) |
| `classUsageKeywords` | `string[]` | Keywords that precede class names in usage (`new`, `extends`, `instanceof`) |
| `declarationKeywords` | `Record<string, string>` | Maps keywords to expectation types (`function` → `EXPECT_FUNCTION_NAME`, etc.) |
| `controls` | `string[]` | Additional control-flow keywords beyond the built-in set |

## Feature flags

Feature flags gate subsystems that may not apply to all languages. They default to
`false` and are set per-language in the language definition.

| Flag | Purpose | Default |
|------|---------|---------|
| `declarations` | Track named declarations for hoisted lookup | `true` |
| `contextStack` | Track scopes (blocks, functions, classes, objects) | `true` |
| `classDetection` | Detect class/type names from keyword patterns | `false` |
| `parameterBindings` | Analyze arrow function parameters | `false` |
| `retroactiveRewrite` | Rewrite tokens after `=>` is seen | `false` |
| `typeAnnotationAware` | Skip type annotations in binding analysis | `false` |
| `propertyKeys` | Detect string keys before `:` as property | `false` |
