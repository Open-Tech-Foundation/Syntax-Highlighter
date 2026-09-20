// Showcase: modern JavaScript — one file, many features.
import { readFile } from "node:fs/promises";
import { highlight } from "./lib.js";

const DEFAULT_LANG = "javascript";
const MAX_RETRIES = 3;
const FLAG = 0xff;
const RATIO = 0.75;
const BIG = 1_000_000;
const EXP = 1e-3;

/**
 * Retry an async operation with exponential backoff.
 * @param {() => Promise<any>} fn the work to attempt
 * @param {number} retries remaining attempts
 */
export async function retry(fn, retries = MAX_RETRIES) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) throw error;
      const delay = 2 ** attempt * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Nullish coalescing, optional chaining, and logical assignment.
export function normalizeOptions(input) {
  const opts = input ?? {};
  opts.theme ??= "dark";
  opts.plugins ||= [];
  const nested = opts?.render?.target?.toUpperCase();
  return { ...opts, nested };
}

// Destructuring, rest/spread, and default parameters.
export function summarize({ title, tags = [], ...rest }) {
  const [first, ...others] = tags;
  return { title, first, count: others.length, rest };
}

// Template literals with nesting and tagged templates.
export function greeting(user) {
  const { name = "world", roles = [] } = user ?? {};
  return `hello, ${name}! you have ${roles.length} role${roles.length === 1 ? "" : "s"}.`;
}

export function sql(strings, ...values) {
  return strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");
}

// Classes: inheritance, private fields, static blocks, getters.
export class Highlighter {
  static supported = ["javascript", "typescript"];
  static {
    Object.freeze(Highlighter.supported);
  }

  #cache = new Map();

  constructor(language = DEFAULT_LANG) {
    this.language = language;
  }

  get size() {
    return this.#cache.size;
  }

  async highlight(source) {
    if (typeof source !== "string") {
      throw new TypeError(`expected string, got ${typeof source}`);
    }
    const hit = this.#cache.get(source);
    if (hit) return hit;
    const tokens = await highlight(source, this.language);
    this.#cache.set(source, tokens);
    return tokens;
  }

  clear() {
    this.#cache.clear();
  }
}

class HtmlHighlighter extends Highlighter {
  #prefix = "sh-";

  constructor(language, prefix) {
    super(language);
    if (prefix) this.#prefix = prefix;
  }

  render(source, tokens) {
    const open = (t) => `<span class="${this.#prefix}${t.type}">`;
    return tokens
      .map((t) => open(t) + `${source.slice(t.start, t.end)}</span>`)
      .join("");
  }
}

// Generators, iterators, and custom iterable protocol.
export function* fibonacci(limit = 10) {
  let [a, b] = [0, 1];
  while (a < limit) {
    yield a;
    [a, b] = [b, a + b];
  }
}

export const range = {
  *[Symbol.iterator]() {
    for (let i = 0; i < 3; i++) yield i * 2;
  },
};

// Map, Set, WeakMap, and computed property names.
const seen = new Set(["a", "b"]);
const meta = new WeakMap();
const dynamic = "answer";
const lookup = { [dynamic]: 42, ...Object.fromEntries(seen) };

// Regex literals with flags, named groups, and replace callbacks.
const EMAIL_RE = /^(?<user>[^@\s]+)@(?<host>[^@\s]+\.[a-z]{2,})$/i;
export function maskEmail(email) {
  return String(email).replace(EMAIL_RE, (...args) => {
    const groups = args.at(-1);
    return `${groups.user.slice(0, 2)}***@${groups.host}`;
  });
}

// Arrow functions, ternaries, and short-circuit defaults.
const isOk = (code) => code >= 200 && code < 300;
const label = (n) => (n === 0 ? "none" : n === 1 ? "one" : "many");

// Async iteration, Promise combinators, and AbortController.
export async function fetchAll(urls, { timeout = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const results = await Promise.allSettled(
      urls.map((url) => fetch(url, { signal: controller.signal }).then((r) => r.text())),
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  } finally {
    clearTimeout(timer);
  }
}

export async function* streamLines(path) {
  const text = await readFile(path, "utf8");
  for (const line of text.split("\n")) {
    if (line.trim() !== "") yield line;
  }
}

// Switch, labeled loops, and control-flow keywords.
export function classify(n) {
  switch (true) {
    case n < 0:
      return "negative";
    case n === 0:
      return "zero";
    default:
      return "positive";
  }
}

outer: for (let i = 0; i < 3; i++) {
  for (const ch of "ab") {
    if (ch === "b") continue outer;
    console.log(i, ch);
  }
}

// Top-level await, dynamic import, and error handling.
try {
  const mod = await import(`./langs/${DEFAULT_LANG}.js`);
  console.log("loaded", mod?.name ?? "unknown");
} catch (err) {
  console.error("failed to load language:", err.message);
  throw err;
} finally {
  console.log("done.");
}

export default Highlighter;
