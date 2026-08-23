/**
 * The words the page is made of, and the sample source the playground loads.
 *
 * Everything here touches no DOM, so `esdev test` can run it — there is no DOM
 * in the runtime.
 */

/** One entry in the row of links at the foot of the page. */
export type Link = {
  label: string;
  href: string;
};

export const LEDE =
  "Playground for @opentf/syntax-highlighter — edit code, switch languages and themes, inspect the tokens.";

export const LINKS: readonly Link[] = [
  { label: "Docs", href: "https://github.com/Open-Tech-Foundation/Syntax-Highlighter" },
  { label: "ES Runtime", href: "https://esrun.opentechf.org" },
  { label: "Open Tech Foundation", href: "https://opentechf.org" },
];

/** The line telling whoever scaffolded this where to start. */
export function editHint(file: string): string {
  return `Edit ${file} and save.`;
}

/** One named snippet the sample picker can load into the editor. */
export type Sample = {
  name: string;
  language: string;
  source: string;
};

export const SAMPLES: readonly Sample[] = [
  {
    name: "javascript — async / await",
    language: "javascript",
    source: `async function fetchUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

const user = await fetchUser(42);`,
  },
  {
    name: "javascript — classes & this",
    language: "javascript",
    source: `class Counter extends Widget {
  #count = 0;
  static from(el) { return new Counter(el); }
  increment() { return ++this.#count; }
}

const counter = Counter.from(document.body);
counter.increment();`,
  },
  {
    name: "typescript — generics & types",
    language: "typescript",
    source: `type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function fetchJson<T>(url: string): Promise<Result<T>> {
  const res = await fetch(url);
  if (!res.ok) return { ok: false, error: \`HTTP \${res.status}\` };
  return { ok: true, value: await res.json() as T };
}

const r = await fetchJson<{ id: number }>("/api/user/42");`,
  },
  {
    name: "jsx — component",
    language: "jsx",
    source: `function App({ name }) {
  const [count, setCount] = useState(0);
  return (
    <div className="app" onClick={() => setCount(c => c + 1)}>
      <h1>Hello, {name}!</h1>
      <p>count is {count}</p>
    </div>
  );
}`,
  },
  {
    name: "html — page",
    language: "html",
    source: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Demo</title>
  </head>
  <body>
    <div id="app" class="container">
      <!-- greeting -->
      <p data-value="hi">Hello</p>
    </div>
  </body>
</html>`,
  },
  {
    name: "css — layout",
    language: "css",
    source: `/* theme */
:root {
  --gap: 1rem;
}

.container {
  display: flex;
  gap: var(--gap);
  color: #24292f;
}

@media (prefers-color-scheme: dark) {
  .container { color: #abb2bf; }
}`,
  },
  {
    name: "python — def & f-string",
    language: "python",
    source: `def greet(name: str) -> str:
    # comment
    if not name:
        return "hi"
    return f"Hello, {name}!"

for i in range(3):
    print(greet(f"user {i}"))`,
  },
  {
    name: "json — config",
    language: "json",
    source: `{
  "name": "demo",
  "version": "1.0.0",
  "private": true,
  // comment (jsonc)
  "keywords": ["demo", "test"]
}`,
  },
  {
    name: "bash — script",
    language: "bash",
    source: `#!/usr/bin/env bash
# deploy
set -euo pipefail

if [[ -z "\${1:-}" ]]; then
  echo "usage: $0 <env>"
  exit 1
fi

echo "deploying to $1..."`,
  },
  {
    name: "sql — query",
    language: "sql",
    source: `-- top users
SELECT u.id, u.name, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = true
GROUP BY u.id
ORDER BY orders DESC
LIMIT 10;`,
  },
  {
    name: "yaml — workflow",
    language: "yaml",
    source: `# workflow
name: ci
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install`,
  },
  {
    name: "markdown — doc",
    language: "markdown",
    source: `# Title

> A **bold** _italic_ note.

- item one
- item \`code\`

\`\`\`js
console.log("hi");
\`\`\`

<!-- comment -->`,
  },
  {
    name: "java — class",
    language: "java",
    source: `public class Main {
  public static void main(String[] args) {
    // comment
    System.out.println("Hello");
  }
}`,
  },
  {
    name: "go — func",
    language: "go",
    source: `package main

import "fmt"

func greet(name string) string {
  // comment
  return fmt.Sprintf("Hello, %s!", name)
}`,
  },
  {
    name: "rust — fn",
    language: "rust",
    source: `fn greet(name: &str) -> String {
    // comment
    format!("Hello, {}!", name)
}

let s = greet("world");`,
  },
  {
    name: "php — hello",
    language: "php",
    source: `<?php
// comment
function greet(string $name): string {
  return "Hello, $name!";
}

echo greet("world");`,
  },
  {
    name: "ruby — def",
    language: "ruby",
    source: `# comment
def greet(name)
  "Hello, #{name}!"
end

puts greet("world")`,
  },
  {
    name: "c — hello",
    language: "c",
    source: `#include <stdio.h>

// comment
int main() {
  printf("Hello, world!\n");
  return 0;
}`,
  },
  {
    name: "cpp — hello",
    language: "cpp",
    source: `#include <iostream>

// comment
int main() {
  std::cout << "Hello, world!" << std::endl;
  return 0;
}`,
  },
  {
    name: "csharp — hello",
    language: "csharp",
    source: `using System;

// comment
class Program {
  static void Main() {
    Console.WriteLine("Hello, world!");
  }
}`,
  },
  {
    name: "swift — func",
    language: "swift",
    source: `// comment
func greet(name: String) -> String {
  return "Hello, (name)!"
}

let s = greet(name: "world")`,
  },
  {
    name: "kotlin — fun",
    language: "kotlin",
    source: `// comment
fun greet(name: String): String {
  return "Hello, $name!"
}

val s = greet("world")`,
  },

  {
    name: "dart — class",
    language: "dart",
    source: `class Greeter {
  final String name;
  Greeter(this.name);
  // comment
  String greet() => 'Hello, $name!';
}
var g = Greeter('world');`,
  },
  {
    name: "scala — def",
    language: "scala",
    source: `object Main extends App {
  // comment
  def greet(name: String): String = s"Hello, $name!"
  println(greet("world"))
}`,
  },
  {
    name: "lua — function",
    language: "lua",
    source: `-- comment
function greet(name)
  return "Hello, " .. name .. "!"
end
print(greet("world"))`,
  },
  {
    name: "perl — sub",
    language: "perl",
    source: `# comment
sub greet {
  my $name = shift;
  return "Hello, $name!";
}
print greet("world");`,
  },
  {
    name: "r — function",
    language: "r",
    source: `# comment
greet <- function(name) {
  paste0("Hello, ", name, "!")
}
print(greet("world"))`,
  },
  {
    name: "powershell — function",
    language: "powershell",
    source: `# comment
function Greet {
  param([string]$Name)
  return "Hello, $Name!"
}
Greet -Name "world"`,
  },
  {
    name: "objectivec — interface",
    language: "objectivec",
    source: `// comment
@interface Greeter : NSObject
- (NSString *)greet:(NSString *)name;
@end
@implementation Greeter
- (NSString *)greet:(NSString *)name {
  return [NSString stringWithFormat:@"Hello, %@!", name];
}
@end`,
  },
  {
    name: "haskell — hello",
    language: "haskell",
    source: `-- comment
greet :: String -> String
greet name = "Hello, " ++ name ++ "!"
main = print (greet "world")`,
  },
  {
    name: "elixir — def",
    language: "elixir",
    source: `# comment
defmodule Greeter do
  def greet(name) do
    "Hello, #{name}!"
  end
end
IO.puts Greeter.greet("world")`,
  },
  {
    name: "zig — fn",
    language: "zig",
    source: `// comment
const std = @import("std");
fn greet(name: []const u8) []const u8 {
  return name;
}
pub fn main() void {
  _ = greet("world");
}`,
  },

  {
    name: "scss — variables",
    language: "scss",
    source: `// comment
$primary: #333;
@mixin center {
  display: flex;
  justify-content: center;
}
.container {
  @include center;
  color: $primary;
}`,
  },
  {
    name: "vue — sfc",
    language: "vue",
    source: `<template>
  <!-- comment -->
  <div class="app">{{ msg }}</div>
</template>
<script setup>
import { ref } from 'vue';
const msg = ref('Hello');
</script>`,
  },
  {
    name: "svelte — component",
    language: "svelte",
    source: `<script>
  // comment
  let count = 0;
  function inc() { count += 1; }
</script>
<button on:click={inc}>{count}</button>`,
  },
  {
    name: "toml — config",
    language: "toml",
    source: `# comment
[owner]
name = "Tom"
[database]
server = "192.168.1.1"
ports = [8000, 8001]`,
  },
  {
    name: "xml — doc",
    language: "xml",
    source: `<?xml version="1.0"?>
<!-- comment -->
<note>
  <to>User</to>
  <from>App</from>
  <body>Hello</body>
</note>`,
  },
  {
    name: "graphql — query",
    language: "graphql",
    source: `# comment
query GetUser {
  user(id: "1") {
    name
    email
  }
}`,
  },
  {
    name: "dockerfile — build",
    language: "dockerfile",
    source: `# comment
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]`,
  },
  {
    name: "diff — patch",
    language: "diff",
    source: `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
-hello
+hello world
 context`,
  },

  {
    name: "matlab — function",
    language: "matlab",
    source: `function y = greet(name)
% comment
if nargin < 1
  name = "world";
end
y = ["Hello, " name "!"];
end`,
  },
  {
    name: "clojure — defn",
    language: "clojure",
    source: `;; comment
(defn greet [name]
  (str "Hello, " name "!"))
(println (greet "world"))`,
  },
  {
    name: "fsharp — let",
    language: "fsharp",
    source: `// comment
let greet name = sprintf "Hello, %s!" name
printfn "%s" (greet "world")`,
  },
  {
    name: "groovy — def",
    language: "groovy",
    source: `// comment
def greet(name) {
  return "Hello, " + name + "!"
}
println greet("world")`,
  },
  {
    name: "solidity — contract",
    language: "solidity",
    source: `// comment
pragma solidity ^0.8.0;
contract Greeter {
  function greet(string memory name) public pure returns (string memory) {
    return "hello";
  }
}`,
  },
  {
    name: "makefile — rule",
    language: "makefile",
    source: `# comment
all: build
build:
\t@echo "Hello"
.PHONY: all build`,
  },
  {
    name: "cmake — project",
    language: "cmake",
    source: `# comment
cmake_minimum_required(VERSION 3.20)
project(hello)
add_executable(hello main.cpp)`,
  },
  {
    name: "nginx — server",
    language: "nginx",
    source: `# comment
server {
  listen 80;
  server_name example.com;
  location / {
    proxy_pass http://app;
  }
}`,
  },
  {
    name: "latex — doc",
    language: "latex",
    source: `% comment
\\documentclass{article}
\\begin{document}
Hello, world!
\\end{document}`,
  },
  {
    name: "regex — pattern",
    language: "regex",
    source: `# comment
^[a-z]+/[0-9]+$`,
  },
  {
    name: "protobuf — message",
    language: "protobuf",
    source: `// comment
syntax = "proto3";
package hello;
message Greeter {
  string name = 1;
}`,
  },
  {
    name: "hcl — resource",
    language: "hcl",
    source: `# comment
resource "aws_instance" "web" {
  ami = "ami-12345"
  instance_type = "t2.micro"
}`,
  },

  {
    name: "http — request",
    language: "http",
    source: `GET /api/users HTTP/1.1
Host: example.com
Accept: application/json
Authorization: Bearer token123

{"query": "test"}`,
  },

  {
    name: "erlang — case",
    language: "erlang",
    source: `% comment
case X of
  1 -> ok;
  _ -> error
end.`,
  },
  {
    name: "julia — function",
    language: "julia",
    source: `# comment
function greet(name)
  return "Hello, " * name * "!"
end
println(greet("world"))`,
  },
  {
    name: "assembly — mov",
    language: "assembly",
    source: `; comment
section .text
global _start
_start:
  mov rax, 1
  ret`,
  },
  {
    name: "nim — proc",
    language: "nim",
    source: `# comment
proc greet(name: string): string =
  result = "Hello, " & name & "!"
echo greet("world")`,
  },
  {
    name: "crystal — def",
    language: "crystal",
    source: `# comment
def greet(name)
  "Hello, #{name}!"
end
puts greet("world")`,
  },
  {
    name: "less — mixin",
    language: "less",
    source: `/* comment */
@color: #111;
.mixin(@a) { color: @a; }
.box { .mixin(@color); }`,
  },
  {
    name: "astro — component",
    language: "astro",
    source: `---
// comment
import Layout from '../layouts/Layout.astro';
---
<Layout title="Hi"><h1>Hello</h1></Layout>`,
  },
  {
    name: "pug — template",
    language: "pug",
    source: `// comment
doctype html
html
  body
    h1 Hello #{name}`,
  },
  {
    name: "handlebars — if",
    language: "handlebars",
    source: `{{!-- comment --}}
{{#if user}}
  Hello {{user.name}}!
{{/if}}`,
  },
  {
    name: "jinja — block",
    language: "jinja",
    source: `{# comment #}
{% if user %}
  Hello {{ user.name }}!
{% endif %}`,
  },
  {
    name: "liquid — assign",
    language: "liquid",
    source: `{% comment %}comment{% endcomment %}
{% assign name = "world" %}
Hello {{ name }}!`,
  },
  {
    name: "nix — let",
    language: "nix",
    source: `# comment
{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell { buildInputs = [ pkgs.hello ]; }`,
  },
  {
    name: "batch — echo",
    language: "batch",
    source: `@echo off
rem comment
echo Hello %NAME%
pause`,
  },
  {
    name: "gitconfig — section",
    language: "gitconfig",
    source: `# comment
[user]
  name = Test
  email = test@example.com`,
  },
  {
    name: "actions — workflow",
    language: "actions",
    source: `# comment
name: ci
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`,
  },
  {
    name: "kubernetes — deployment",
    language: "kubernetes",
    source: `# comment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3`,
  },
  {
    name: "rst — directive",
    language: "rst",
    source: `.. note::
  -- comment
  Hello, world!
`,
  },
  {
    name: "asciidoc — header",
    language: "asciidoc",
    source: `// comment
= Hello
Author Name

Hello, world!`,
  },

  {
    name: "ocaml — let",
    language: "ocaml",
    source: `(* comment *)
let greet name = "Hello, " ^ name ^ "!"
let () = print_endline (greet "world")`,
  },
  {
    name: "elm — case",
    language: "elm",
    source: `-- comment
greet name = "Hello, " ++ name ++ "!"
main = greet "world"`,
  },
  {
    name: "fortran — program",
    language: "fortran",
    source: `! comment
program hello
  print *, "Hello, world!"
end program hello`,
  },
  {
    name: "pascal — program",
    language: "pascal",
    source: `{ comment }
program Hello;
begin
  writeln('Hello, world!');
end.`,
  },
  {
    name: "ada — procedure",
    language: "ada",
    source: `-- comment
procedure Hello is
begin
  Put_Line("Hello, world!");
end Hello;`,
  },
  {
    name: "lisp — defun",
    language: "lisp",
    source: `; comment
(defun greet (name)
  (format t "Hello, ~a!" name))
(greet "world")`,
  },
  {
    name: "scheme — define",
    language: "scheme",
    source: `; comment
(define (greet name)
  (string-append "Hello, " name "!"))
(display (greet "world"))`,
  },
  {
    name: "prolog — fact",
    language: "prolog",
    source: `% comment
greet(Name) :- format("Hello, ~w!~n", [Name]).
:- greet(world).`,
  },
  {
    name: "smalltalk — hello",
    language: "smalltalk",
    source: `" comment "
Transcript show: 'Hello, world!'; cr.`,
  },
  {
    name: "d — hello",
    language: "d",
    source: `// comment
import std.stdio;
void main() {
  writeln("Hello, world!");
}`,
  },
  {
    name: "v — fn",
    language: "v",
    source: `// comment
fn greet(name string) string {
  return 'Hello, ' + name + '!'
}
println(greet('world'))`,
  },
  {
    name: "odin — proc",
    language: "odin",
    source: `// comment
package main
greet :: proc(name: string) -> string {
  return "Hello"
}`,
  },
  {
    name: "gleam — fn",
    language: "gleam",
    source: `// comment
pub fn greet(name) {
  "Hello, " <> name <> "!"
}`,
  },
  {
    name: "tcl — proc",
    language: "tcl",
    source: `# comment
proc greet {name} {
  return "Hello, $name!"
}
puts [greet world]`,
  },
  {
    name: "raku — sub",
    language: "raku",
    source: `# comment
sub greet($name) {
  return "Hello, $name!"
}
say greet("world");`,
  },
  {
    name: "vb — sub",
    language: "vb",
    source: `' comment
Sub Greet(name As String)
  Console.WriteLine("Hello, " & name & "!")
End Sub`,
  },
  {
    name: "coffeescript — class",
    language: "coffeescript",
    source: `# comment
greet = (name) -> "Hello, #{name}!"
console.log greet "world"`,
  },
  {
    name: "haml — tag",
    language: "haml",
    source: `// comment
%div Hello #{name}`,
  },
  {
    name: "ejs — if",
    language: "ejs",
    source: `<%# comment %>
<% if (user) { %>
  Hello <%= user.name %>!
<% } %>`,
  },
  {
    name: "stylus — rule",
    language: "stylus",
    source: `// comment
body
  color #111
  .box
    color #222`,
  },
  {
    name: "ini — section",
    language: "ini",
    source: `; comment
[section]
key = value`,
  },
  {
    name: "env — vars",
    language: "env",
    source: `# comment
API_KEY=123
DEBUG=true`,
  },
  {
    name: "csv — data",
    language: "csv",
    source: `# comment
name,age
Alice,30
Bob,25`,
  },
  {
    name: "properties — keys",
    language: "properties",
    source: `# comment
key=value
hello=world`,
  },
  {
    name: "fish — function",
    language: "fish",
    source: `# comment
function greet
  echo "Hello, $argv!"
end`,
  },
  {
    name: "systemd — unit",
    language: "systemd",
    source: `# comment
[Unit]
Description=Hello
[Service]
ExecStart=/usr/bin/hello`,
  },
  {
    name: "apache — config",
    language: "apache",
    source: `# comment
ServerName example.com
DocumentRoot /var/www/html`,
  },
  {
    name: "typst — let",
    language: "typst",
    source: `// comment
#let greet(name) = [Hello, #name!]
#greet("world")`,
  },
  {
    name: "org — headline",
    language: "org",
    source: `# comment
* Hello
** World`,
  },
  {
    name: "wasm — module",
    language: "wasm",
    source: `; comment
(module
  (func $greet (param $n i32) (result i32)
    local.get $n))`,
  },

  {
    name: "stf — config",
    language: "stf",
    source: `# comments are part of the format
{
  service: \`checkout-api\`,
  enabled: T,
  launch_on: DATE(2026-02-01),
  deploy_after: TIMESTAMP(2026-01-15T10:30:00Z),
  price_cap: DECIMAL(199.00),   # scale is data
  account_id: BIGINT(9007199254740993),
  signing_key: BINARY(SGVsbG8=),
  boundary: Geometry("Polygon", [
    [
      [80.27, 13.08],
      [80.28, 13.08],
      [80.28, 13.09],
      [80.27, 13.08]
    ]
  ]),
  opens: Time("09:30"),
  ttl: Duration("PT45M"),
  regions: [\`eu-west-1\`, \`us-east-1\`]
}`,
  },
  {
    name: "stf — stream",
    language: "stf",
    source: `@version(1.0)
{at: TIMESTAMP(2026-01-15T10:30:00Z), level: \`warn\`}
{at: TIMESTAMP(2026-01-15T10:30:04Z), level: \`info\`}`,
  },
];

/** A one-line status message. */
export function statusMessage(kind: "ok" | "error", text: string): string {
  return kind === "ok" ? text : `error: ${text}`;
}
