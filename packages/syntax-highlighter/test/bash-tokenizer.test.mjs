import { assert, assertEquals, test } from "runtime:test";
import { Highlighter } from "../src/core/highlighter.ts";
import { validateTokens } from "../src/core/json-renderer.ts";
import bash from "../src/languages/bash.ts";

const highlighter = new Highlighter(bash);

/** `type:text` for every non-whitespace token, after checking the contract. */
function kinds(src) {
  const tokens = highlighter.highlight(src);
  validateTokens(src, tokens);
  return tokens
    .filter((t) => t.type !== "whitespace")
    .map((t) => `${t.type}:${src.slice(t.start, t.end)}`);
}

function has(src, expected) {
  const actual = kinds(src);
  for (const e of expected) {
    if (!actual.includes(e)) throw new Error(`expected ${e} in ${JSON.stringify(actual)}`);
  }
}

test("the first word is the command; later words are arguments", () => {
  assertEquals(kinds("npm run build"), ["function:npm", "string:run", "string:build"]);
});

test("every command after a separator is a command", () => {
  has("cd dir && make; ls | grep x || echo no", [
    "function:cd",
    "function:make",
    "function:ls",
    "function:grep",
    "function:echo",
    "string:dir",
    "string:x",
  ]);
});

test("options are constants; an option's =value is a string", () => {
  has("grep -n --color=auto pattern", [
    "constant:-",
    "constant:n",
    "constant:color",
    "string:auto",
    "string:pattern",
  ]);
});

test("assignments: prefix assignments keep command position; export/local declare", () => {
  has("LANG=C sort file", ["variable:LANG", "operator:=", "string:C", "function:sort"]);
  has('export PATH="$HOME/bin"', ["keyword:export", "variable:PATH", "variable:$HOME"]);
  has("local count=0", ["keyword:local", "variable:count"]);
});

test("variables inside double quotes are split out; single quotes are literal", () => {
  assertEquals(kinds('echo "Hi $USER, ${HOME}!"'), [
    "function:echo",
    'string:"Hi ',
    "variable:$USER",
    "string:, ",
    "string:${",
    "variable:HOME",
    "string:}",
    'string:!"',
  ]);
  assertEquals(kinds("echo '$USER'"), ["function:echo", "string:'$USER'"]);
});

test("special and positional parameters", () => {
  has('echo "$1 $@ $? $#" $0', [
    "variable:$1",
    "variable:$@",
    "variable:$?",
    "variable:$#",
    "variable:$0",
  ]);
});

test("command substitution in strings, with nested quotes", () => {
  assertEquals(kinds('dir="$(dirname "$0")"'), [
    "variable:dir",
    "operator:=",
    'string:"',
    "string:$(",
    "function:dirname",
    'string:"$0"',
    "string:)",
    'string:"',
  ]);
});

test("command substitution outside strings starts a command", () => {
  has("x=$(date +%s)", ["variable:x", "function:date"]);
});

test("double-quoted strings may span lines", () => {
  has('echo "line one\nline two"', ['string:"line one\nline two"']);
});

test("redirections are operators; their target is a filename", () => {
  has("cmd > out.log 2>&1", ["operator:>", "string:out", "operator:2"]);
  has('echo "x" >&2', ["operator:>", "operator:&", "operator:2"]);
});

test("test brackets: flags are operators, && joins tests", () => {
  has('if [[ -z "$a" && $n -eq 3 ]]; then exit 1; fi', [
    "control:if",
    "operator:z",
    "variable:$n",
    "operator:eq",
    "number:3",
    "keyword:then",
    "function:exit",
    "number:1",
    "keyword:fi",
  ]);
});

test("loops, functions, and grouping", () => {
  has('for f in *.txt; do cat "$f"; done', [
    "control:for",
    "keyword:in",
    "control:do",
    "function:cat",
    "keyword:done",
  ]);
  has("build() {\n  make all\n}", [
    "function:build",
    "punctuation:{",
    "function:make",
    "string:all",
    "punctuation:}",
  ]);
});

test("case patterns are strings; the commands after them are commands", () => {
  has('case "$1" in\n  start|run) start_it ;;\n  *) usage ;;\nesac', [
    "control:case",
    "string:start",
    "string:run",
    "function:start_it",
    "function:usage",
    "keyword:esac",
  ]);
});

test("heredoc bodies are strings up to the delimiter", () => {
  assertEquals(kinds("cat <<EOF\nif this; then that\nEOF\nls"), [
    "function:cat",
    "operator:<<",
    "operator:EOF",
    "string:if",
    "string:this",
    "string:;",
    "string:then",
    "string:that",
    "keyword:EOF",
    "function:ls",
  ]);
  has("cat <<-'END'\n\tbody\n\tEND\npwd", ["string:body", "function:pwd"]);
});

test("line continuations keep the command going", () => {
  const out = kinds("docker run \\\n  --rm image");
  assert(out.includes("constant:rm") && out.includes("string:image"), JSON.stringify(out));
});

test("malformed input still satisfies the token contract", () => {
  for (const src of [
    'echo "$(',
    'x="$(a "b',
    "cat <<EOF\nno end",
    "case x in",
    "${",
    '"${x',
    "[[ -z",
  ]) {
    kinds(src);
  }
});
