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
  source: string;
};

export const SAMPLES: readonly Sample[] = [
  {
    name: "async / await",
    source: `async function fetchUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

const user = await fetchUser(42);`,
  },
  {
    name: "classes & this",
    source: `class Counter extends Widget {
  #count = 0;
  static from(el) { return new Counter(el); }
  increment() { return ++this.#count; }
}

const counter = Counter.from(document.body);
counter.increment();`,
  },
  {
    name: "regex vs division",
    source: `const ratio = total / count;
const re = /ab+c/gi;
const half = width / 2;
return /pattern/.test(input);`,
  },
  {
    name: "templates & decorators",
    source: `@Component({ selector: "app-root" })
class App {
  render(name) {
    return \`Hello, \${name}! 1 + 1 = \${1 + 1}\`;
  }
}`,
  },
];

/** A one-line status message. */
export function statusMessage(kind: "ok" | "error", text: string): string {
  return kind === "ok" ? text : `error: ${text}`;
}
