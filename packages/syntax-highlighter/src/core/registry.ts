import type { LanguageDefinition } from "./lexer.ts";

const registered = new Map<string, LanguageDefinition>();

const builtinLoaders: Record<string, () => Promise<LanguageDefinition>> = {
  javascript: () => import("../languages/javascript.ts").then((m) => m.default),
};

export function registerLanguage(
  definition: LanguageDefinition,
): LanguageDefinition {
  if (!definition?.name) {
    throw new Error("Language definition requires a name");
  }
  registered.set(definition.name.toLowerCase(), definition);
  for (const alias of definition.aliases ?? []) {
    registered.set(alias.toLowerCase(), definition);
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

export function getRegisteredLanguages(): string[] {
  return [...new Set(registered.values())].map((d) => d.name);
}
