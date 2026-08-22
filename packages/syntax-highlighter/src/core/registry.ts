import type { LanguageDefinition } from "./lexer.ts";

const registered = new Map<string, LanguageDefinition>();

const builtinLoaders: Record<string, () => Promise<LanguageDefinition>> = {
  javascript: () => import("../languages/javascript.ts").then((m) => m.default),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateStringArray(value: unknown, path: string): void {
  if (value === undefined) return;
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    throw new Error(`${path} must be an array of non-empty strings`);
  }
}

function validateLanguageDefinition(value: unknown): asserts value is LanguageDefinition {
  if (!isRecord(value) || typeof value.name !== "string" || !value.name.trim()) {
    throw new Error("Language definition requires a non-empty name");
  }

  for (const field of [
    "aliases",
    "keywords",
    "booleans",
    "nulls",
    "constants",
    "regexKeywords",
    "operators",
    "punctuation",
  ]) {
    validateStringArray(value[field], `Language definition ${field}`);
  }

  if (
    value.semantic !== undefined &&
    value.semantic !== "javascript" &&
    value.semantic !== "generic"
  ) {
    throw new Error('Language definition semantic must be "javascript" or "generic"');
  }

  if (value.lex === undefined) return;
  if (!isRecord(value.lex)) {
    throw new Error("Language definition lex must be an object");
  }

  validateStringArray(value.lex.operators, "Language definition lex.operators");
  validateStringArray(value.lex.punctuation, "Language definition lex.punctuation");
  validateStringArray(
    value.lex.regexAfterParenKeywords,
    "Language definition lex.regexAfterParenKeywords",
  );

  if (value.lex.strings !== undefined) {
    if (!Array.isArray(value.lex.strings)) {
      throw new Error("Language definition lex.strings must be an array");
    }
    for (const [index, stringDef] of value.lex.strings.entries()) {
      if (
        !isRecord(stringDef) ||
        typeof stringDef.open !== "string" ||
        !stringDef.open ||
        typeof stringDef.close !== "string" ||
        !stringDef.close
      ) {
        throw new Error(`Language definition lex.strings[${index}] has invalid delimiters`);
      }
      if (stringDef.escape !== undefined && typeof stringDef.escape !== "string") {
        throw new Error(`Language definition lex.strings[${index}].escape must be a string`);
      }
      for (const field of ["multiline", "template"]) {
        if (stringDef[field] !== undefined && typeof stringDef[field] !== "boolean") {
          throw new Error(`Language definition lex.strings[${index}].${field} must be boolean`);
        }
      }
    }
  }

  if (value.lex.comments !== undefined) {
    if (!Array.isArray(value.lex.comments)) {
      throw new Error("Language definition lex.comments must be an array");
    }
    for (const [index, commentDef] of value.lex.comments.entries()) {
      if (
        !isRecord(commentDef) ||
        typeof commentDef.open !== "string" ||
        !commentDef.open ||
        typeof commentDef.close !== "string" ||
        !commentDef.close
      ) {
        throw new Error(`Language definition lex.comments[${index}] has invalid delimiters`);
      }
      if (commentDef.line !== undefined && typeof commentDef.line !== "boolean") {
        throw new Error(`Language definition lex.comments[${index}].line must be boolean`);
      }
    }
  }

  for (const field of ["regex", "shebang"]) {
    if (value.lex[field] !== undefined && typeof value.lex[field] !== "boolean") {
      throw new Error(`Language definition lex.${field} must be boolean`);
    }
  }
  for (const field of ["identifierStart", "identifierPart"]) {
    if (value.lex[field] !== undefined && !(value.lex[field] instanceof RegExp)) {
      throw new Error(`Language definition lex.${field} must be a RegExp`);
    }
  }
  if (value.lex.scanNumber !== undefined && typeof value.lex.scanNumber !== "function") {
    throw new Error("Language definition lex.scanNumber must be a function");
  }
}

export function registerLanguage(
  definition: LanguageDefinition,
): LanguageDefinition {
  validateLanguageDefinition(definition);
  const nameKey = definition.name.toLowerCase();
  const aliasKeys = (definition.aliases ?? [])
    .map((alias) => alias.toLowerCase())
    .filter((alias) => alias !== nameKey);

  // Re-registering under the same *name* replaces the old definition on
  // purpose. An alias silently taking over some other language's name is a
  // different thing, and always a mistake — reject it. Every conflict is
  // checked before the registry is touched so a rejected definition cannot
  // leave half of itself registered.
  for (const alias of aliasKeys) {
    const existing = registered.get(alias);
    const takesRegisteredName =
      existing !== undefined &&
      existing !== definition &&
      existing.name.toLowerCase() === alias;
    if (takesRegisteredName || builtinLoaders[alias] !== undefined) {
      throw new Error(
        `Language definition alias "${alias}" is already the name of another language`,
      );
    }
  }

  for (const [key, current] of registered) {
    if (current.name.toLowerCase() === nameKey) registered.delete(key);
  }
  registered.set(nameKey, definition);
  for (const alias of aliasKeys) {
    registered.set(alias, definition);
  }
  return definition;
}

export async function loadLanguage(name?: string): Promise<LanguageDefinition> {
  const key = String(name ?? "javascript").toLowerCase();
  const known = registered.get(key);
  if (known) return known;

  const loader = builtinLoaders[key];
  if (!loader) {
    throw new Error(`Unknown language: ${name}`);
  }
  return registerLanguage(await loader());
}

/**
 * Every language `loadLanguage()` will resolve, by canonical name. Built-ins
 * are included before they have been lazily imported — otherwise this returns
 * an empty list on a fresh page and callers building a language picker have
 * to hard-code the built-ins back in.
 */
export function getRegisteredLanguages(): string[] {
  const names = new Set(Object.keys(builtinLoaders));
  for (const definition of new Set(registered.values())) names.add(definition.name);
  return [...names];
}
