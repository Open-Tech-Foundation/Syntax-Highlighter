import type { LanguageDefinition } from "./lexer.ts";

const registered = new Map<string, LanguageDefinition>();

const builtinLoaders: Record<string, () => Promise<LanguageDefinition>> = {
  javascript: () => import("../languages/javascript.ts").then((m) => m.default),
  typescript: () => import("../languages/typescript.ts").then((m) => m.default),
  jsx: () => import("../languages/jsx.ts").then((m) => m.default),
  html: () => import("../languages/html.ts").then((m) => m.default),
  css: () => import("../languages/css.ts").then((m) => m.default),
  python: () => import("../languages/python.ts").then((m) => m.default),
  json: () => import("../languages/json.ts").then((m) => m.default),
  bash: () => import("../languages/bash.ts").then((m) => m.default),
  sql: () => import("../languages/sql.ts").then((m) => m.default),
  yaml: () => import("../languages/yaml.ts").then((m) => m.default),
  markdown: () => import("../languages/markdown.ts").then((m) => m.default),
  java: () => import("../languages/java.ts").then((m) => m.default),
  go: () => import("../languages/go.ts").then((m) => m.default),
  rust: () => import("../languages/rust.ts").then((m) => m.default),
  php: () => import("../languages/php.ts").then((m) => m.default),
  ruby: () => import("../languages/ruby.ts").then((m) => m.default),
  c: () => import("../languages/c.ts").then((m) => m.default),
  cpp: () => import("../languages/cpp.ts").then((m) => m.default),
  csharp: () => import("../languages/csharp.ts").then((m) => m.default),
  swift: () => import("../languages/swift.ts").then((m) => m.default),
  kotlin: () => import("../languages/kotlin.ts").then((m) => m.default),
  dart: () => import("../languages/dart.ts").then((m) => m.default),
  scala: () => import("../languages/scala.ts").then((m) => m.default),
  lua: () => import("../languages/lua.ts").then((m) => m.default),
  perl: () => import("../languages/perl.ts").then((m) => m.default),
  r: () => import("../languages/r.ts").then((m) => m.default),
  powershell: () => import("../languages/powershell.ts").then((m) => m.default),
  objectivec: () => import("../languages/objectivec.ts").then((m) => m.default),
  haskell: () => import("../languages/haskell.ts").then((m) => m.default),
  elixir: () => import("../languages/elixir.ts").then((m) => m.default),
  zig: () => import("../languages/zig.ts").then((m) => m.default),
  scss: () => import("../languages/scss.ts").then((m) => m.default),
  vue: () => import("../languages/vue.ts").then((m) => m.default),
  svelte: () => import("../languages/svelte.ts").then((m) => m.default),
  toml: () => import("../languages/toml.ts").then((m) => m.default),
  xml: () => import("../languages/xml.ts").then((m) => m.default),
  graphql: () => import("../languages/graphql.ts").then((m) => m.default),
  dockerfile: () => import("../languages/dockerfile.ts").then((m) => m.default),
  diff: () => import("../languages/diff.ts").then((m) => m.default),
  matlab: () => import("../languages/matlab.ts").then((m) => m.default),
  clojure: () => import("../languages/clojure.ts").then((m) => m.default),
  fsharp: () => import("../languages/fsharp.ts").then((m) => m.default),
  groovy: () => import("../languages/groovy.ts").then((m) => m.default),
  solidity: () => import("../languages/solidity.ts").then((m) => m.default),
  makefile: () => import("../languages/makefile.ts").then((m) => m.default),
  cmake: () => import("../languages/cmake.ts").then((m) => m.default),
  nginx: () => import("../languages/nginx.ts").then((m) => m.default),
  latex: () => import("../languages/latex.ts").then((m) => m.default),
  regex: () => import("../languages/regex.ts").then((m) => m.default),
  protobuf: () => import("../languages/protobuf.ts").then((m) => m.default),
  hcl: () => import("../languages/hcl.ts").then((m) => m.default),
  http: () => import("../languages/http.ts").then((m) => m.default),
  ocaml: () => import("../languages/ocaml.ts").then((m) => m.default),
  elm: () => import("../languages/elm.ts").then((m) => m.default),
  fortran: () => import("../languages/fortran.ts").then((m) => m.default),
  pascal: () => import("../languages/pascal.ts").then((m) => m.default),
  ada: () => import("../languages/ada.ts").then((m) => m.default),
  lisp: () => import("../languages/lisp.ts").then((m) => m.default),
  scheme: () => import("../languages/scheme.ts").then((m) => m.default),
  prolog: () => import("../languages/prolog.ts").then((m) => m.default),
  smalltalk: () => import("../languages/smalltalk.ts").then((m) => m.default),
  d: () => import("../languages/d.ts").then((m) => m.default),
  v: () => import("../languages/v.ts").then((m) => m.default),
  odin: () => import("../languages/odin.ts").then((m) => m.default),
  gleam: () => import("../languages/gleam.ts").then((m) => m.default),
  tcl: () => import("../languages/tcl.ts").then((m) => m.default),
  raku: () => import("../languages/raku.ts").then((m) => m.default),
  vb: () => import("../languages/vb.ts").then((m) => m.default),
  coffeescript: () => import("../languages/coffeescript.ts").then((m) => m.default),
  haml: () => import("../languages/haml.ts").then((m) => m.default),
  ejs: () => import("../languages/ejs.ts").then((m) => m.default),
  stylus: () => import("../languages/stylus.ts").then((m) => m.default),
  ini: () => import("../languages/ini.ts").then((m) => m.default),
  env: () => import("../languages/env.ts").then((m) => m.default),
  csv: () => import("../languages/csv.ts").then((m) => m.default),
  properties: () => import("../languages/properties.ts").then((m) => m.default),
  fish: () => import("../languages/fish.ts").then((m) => m.default),
  systemd: () => import("../languages/systemd.ts").then((m) => m.default),
  apache: () => import("../languages/apache.ts").then((m) => m.default),
  typst: () => import("../languages/typst.ts").then((m) => m.default),
  org: () => import("../languages/org.ts").then((m) => m.default),
  wasm: () => import("../languages/wasm.ts").then((m) => m.default),
  stf: () => import("../languages/stf.ts").then((m) => m.default),
  erlang: () => import("../languages/erlang.ts").then((m) => m.default),
  julia: () => import("../languages/julia.ts").then((m) => m.default),
  assembly: () => import("../languages/assembly.ts").then((m) => m.default),
  nim: () => import("../languages/nim.ts").then((m) => m.default),
  crystal: () => import("../languages/crystal.ts").then((m) => m.default),
  less: () => import("../languages/less.ts").then((m) => m.default),
  astro: () => import("../languages/astro.ts").then((m) => m.default),
  pug: () => import("../languages/pug.ts").then((m) => m.default),
  handlebars: () => import("../languages/handlebars.ts").then((m) => m.default),
  jinja: () => import("../languages/jinja.ts").then((m) => m.default),
  liquid: () => import("../languages/liquid.ts").then((m) => m.default),
  nix: () => import("../languages/nix.ts").then((m) => m.default),
  batch: () => import("../languages/batch.ts").then((m) => m.default),
  gitconfig: () => import("../languages/gitconfig.ts").then((m) => m.default),
  actions: () => import("../languages/actions.ts").then((m) => m.default),
  kubernetes: () => import("../languages/kubernetes.ts").then((m) => m.default),
  rst: () => import("../languages/rst.ts").then((m) => m.default),
  asciidoc: () => import("../languages/asciidoc.ts").then((m) => m.default),
};

const aliasToCanonical: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  jsonc: "json",
  json5: "json",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  bashrc: "bash",
  ash: "bash",
  md: "markdown",
  mdx: "markdown",
  mkd: "markdown",
  jsp: "java",
  golang: "go",
  rs: "rust",
  pl: "perl",
  pm: "perl",
  rlang: "r",
  rscript: "r",
  ps: "powershell",
  ps1: "powershell",
  psm1: "powershell",
  objc: "objectivec",
  "objective-c": "objectivec",
  m: "objectivec",
  mm: "objectivec",
  hs: "haskell",
  ex: "elixir",
  exs: "elixir",
  sc: "scala",
  sass: "scss",
  htm: "html",
  xhtml: "html",
  yml: "yaml",
  pgsql: "sql",
  postgres: "sql",
  mysql: "sql",
  sqlite: "sql",
  kt: "kotlin",
  kts: "kotlin",
  swiftlang: "swift",
  gql: "graphql",
  docker: "dockerfile",
  patch: "diff",
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  "c#": "csharp",
  clj: "clojure",
  cljs: "clojure",
  cljc: "clojure",
  edn: "clojure",
  "f#": "fsharp",
  fs: "fsharp",
  fsx: "fsharp",
  fsi: "fsharp",
  gradle: "groovy",
  gvy: "groovy",
  sol: "solidity",
  make: "makefile",
  mk: "makefile",
  mak: "makefile",
  gnumake: "makefile",
  nginxconf: "nginx",
  tex: "latex",
  bibtex: "latex",
  re: "regex",
  regexp: "regex",
  proto: "protobuf",
  proto3: "protobuf",
  terraform: "hcl",
  tf: "hcl",
  hcl2: "hcl",
  https: "http",
  "http-request": "http",
  "http-response": "http",
  erl: "erlang",
  hrl: "erlang",
  jl: "julia",
  asm: "assembly",
  nasm: "assembly",
  yasm: "assembly",
  gas: "assembly",
  nimrod: "nim",
  cr: "crystal",
  jade: "pug",
  hbs: "handlebars",
  mustache: "handlebars",
  jinja2: "jinja",
  django: "jinja",
  nixos: "nix",
  bat: "batch",
  cmd: "batch",
  batchfile: "batch",
  dos: "batch",
  "git-config": "gitconfig",
  gitignore: "gitconfig",
  gitattributes: "gitconfig",
  "github-actions": "actions",
  gha: "actions",
  workflow: "actions",
  k8s: "kubernetes",
  "k8s-manifest": "kubernetes",
  "k8s-yaml": "kubernetes",
  restructuredtext: "rst",
  rest: "rst",
  adoc: "asciidoc",
  asciidoctor: "asciidoc",
  ml: "ocaml",
  pas: "pascal",
  cl: "lisp",
  "common-lisp": "lisp",
  scm: "scheme",
  st: "smalltalk",
  dlang: "d",
  vlang: "v",
  perl6: "raku",
  vbnet: "vb",
  "visual-basic": "vb",
  coffee: "coffeescript",
  styl: "stylus",
  inifile: "ini",
  conf: "ini",
  dotenv: "env",
  props: "properties",
  service: "systemd",
  unit: "systemd",
  apacheconf: "apache",
  htaccess: "apache",
  wat: "wasm",
  stfs: "stf",
  "stf-schema": "stf",
  webassembly: "wasm",
  octave: "matlab",
  mat: "matlab",
  py: "python",
  py3: "python",
  pyi: "python",
  dartlang: "dart",
  xsl: "xml",
  xslt: "xml",
  svg: "xml",
  rss: "xml",
  atom: "xml",
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

export function registerLanguage(definition: LanguageDefinition): LanguageDefinition {
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
      existing !== undefined && existing !== definition && existing.name.toLowerCase() === alias;
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

  let loader = builtinLoaders[key];
  if (!loader) {
    let canonical: string | undefined = aliasToCanonical[key];
    // transitive: inifile -> conf -> ini etc.
    while (canonical) {
      const nextLoader = builtinLoaders[canonical];
      if (nextLoader) {
        loader = nextLoader;
        break;
      }
      canonical = aliasToCanonical[canonical];
    }
  }
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
