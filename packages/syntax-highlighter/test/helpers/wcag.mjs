/**
 * Color/ANSI helpers for theme contrast tests — thin re-exports of
 * @opentf/std. All test files import from here so the std dependency is
 * referenced in exactly one place.
 *
 * NOTE: these imports only resolve because `[tasks.test]` runs `esdev test`
 * from the workspace root (see tasks.toml). esdev's module sandbox pins
 * resolution to the process working directory, so running the suite inside
 * packages/syntax-highlighter rejects pnpm's hoisted store paths with
 * "escapes the sandbox root".
 */
import { colorContrast, stripANSI } from "@opentf/std";

export const contrast = colorContrast;
export { stripANSI as stripAnsi };
