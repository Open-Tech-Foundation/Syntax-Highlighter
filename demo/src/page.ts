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
];

/** A one-line status message. */
export function statusMessage(kind: "ok" | "error", text: string): string {
  return kind === "ok" ? text : `error: ${text}`;
}
