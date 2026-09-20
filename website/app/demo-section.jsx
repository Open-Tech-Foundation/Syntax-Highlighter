// Live playground: an editable panel highlighted with the real tokenizer
// plus a sidebar listing every supported language.
//
// SSR-safe: the first paint is plain escaped text; highlighting happens in
// `onMount` and on user input. Uses the same `$state`/`$ref`/`onclick`
// idioms as the `ThemeToggle` component from `@opentf/web-docs`.
import {
  createHighlighter,
  getRegisteredLanguages,
  renderHTML,
  WHITESPACE,
} from "@opentf/syntax-highlighter";
import { onMount, RawHtml } from "@opentf/web";

import { demoStyles } from "./demo-styles.js";
import { editorChrome, THEME_ORDER, tokenRules } from "./theme-css.js";

const DEFAULT_LANGUAGE = "javascript";

const SNIPPETS = {
  javascript: 'const greet = (name) => `hello, ${name}!`;\n\nexport default greet("world");\n',
  typescript: "function add(a: number, b: number): number {\n  return a + b;\n}\n",
  python: 'def greet(name):\n    return f"hello, {name}!"\n\nprint(greet("world"))\n',
  json: '{\n  "name": "demo",\n  "enabled": true,\n  "count": 3\n}\n',
  bash: '#!/usr/bin/env bash\nname="${1:-world}"\necho "hello, $name!"\n',
  sql: "SELECT id, name\nFROM users\nWHERE active = TRUE\nORDER BY id;\n",
  yaml: "name: demo\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n",
  markdown:
    "# Hello\n\n**Bold** and *italic* with a [link](https://example.com).\n\n- item one\n- item two\n",
  html: '<main class="demo">\n  <h1>Hello</h1>\n</main>\n',
  css: ".demo {\n  color: rebeccapurple;\n  display: grid;\n}\n",
  java: 'class Hello {\n  public static void main(String[] args) {\n    System.out.println("hi");\n  }\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("hi")\n}\n',
  rust: 'fn main() {\n  println!("hi");\n}\n',
  diff: "--- a/app.ts\n+++ b/app.ts\n@@ -1,2 +1,2 @@\n-const x = 1;\n+const x = 2;\n",
};

function fallbackSnippet(lang) {
  return `// ${lang} sample — type or paste code here\nconst answer = 40 + 2;\nconsole.log(answer);\n`;
}

// Showcase files served from `website/public/samples/` (see manifest.json).
// Fetched at runtime; inline snippets below are the offline fallback.
const SAMPLES_BASE = "/samples";

async function loadFileSamples() {
  try {
    const res = await fetch(`${SAMPLES_BASE}/manifest.json`);
    if (!res.ok) return null;
    const manifest = await res.json();
    const map = new Map();
    await Promise.all(
      manifest.map(async (entry) => {
        try {
          const r = await fetch(`${SAMPLES_BASE}/${entry.file}`);
          if (r.ok) map.set(entry.language, await r.text());
        } catch {
          // ignore one bad file — fallback covers it
        }
      }),
    );
    return map;
  } catch {
    return null;
  }
}

function esc(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const PAINT_DEBOUNCE_MS = 80;

// Token colors live in ./theme-css.js (shared with the hero showcase).
function themeCss(name) {
  return tokenRules(name, "demo-code") + editorChrome(name);
}
export default function DemoSection() {
  let langs = $state([]);
  let lang = $state(DEFAULT_LANGUAGE);
  let source = $state(SNIPPETS[DEFAULT_LANGUAGE]);
  let html = $state(esc(SNIPPETS[DEFAULT_LANGUAGE]));
  let tokenCount = $state(0);
  let filter = $state("");
  let theme = $state("default");
  let gutter = $state(numbersFor(SNIPPETS[DEFAULT_LANGUAGE]));

  // File-backed samples when the fetch succeeds, else inline fallbacks.
  let fileSamples = null;

  const cache = new Map();
  const preRef = $ref();
  const gutterRef = $ref();
  const inputRef = $ref();
  let seq = 0;

  function snippetFor(lang) {
    return fileSamples?.get(lang) ?? SNIPPETS[lang] ?? fallbackSnippet(lang);
  }

  function setSource(next) {
    source = next;
    gutter = numbersFor(next);
    if (inputRef) inputRef.value = next;
  }

  function numbersFor(text) {
    const n = text.split("\n").length;
    let out = "1";
    for (let i = 2; i <= n; i++) out += `\n${i}`;
    return out;
  }

  async function paint(nextLang, nextSource, mySeq) {
    try {
      let h = cache.get(nextLang);
      if (!h) {
        h = await createHighlighter({ language: nextLang });
        cache.set(nextLang, h);
      }
      if (mySeq !== seq) return;
      const toks = h.highlight(nextSource);
      const out = renderHTML(nextSource, toks, { prefix: "token " });
      if (mySeq !== seq) return;
      html = out;
      tokenCount = toks.filter((t) => t.type !== WHITESPACE).length;
    } catch {
      if (mySeq !== seq) return;
      html = esc(nextSource);
    }
  }

  function schedulePaint() {
    const mySeq = ++seq;
    setTimeout(() => {
      if (mySeq !== seq) return;
      paint(lang, source, mySeq);
    }, PAINT_DEBOUNCE_MS);
  }

  async function selectLanguage(next) {
    if (next === lang && cache.has(next)) return;
    const mySeq = ++seq;
    lang = next;
    const nextSource = snippetFor(next);
    setSource(nextSource);
    resetScroll();
    await paint(next, nextSource, mySeq);
  }

  function resetScroll() {
    if (inputRef) {
      inputRef.scrollTop = 0;
      inputRef.scrollLeft = 0;
    }
    if (preRef) {
      preRef.scrollTop = 0;
      preRef.scrollLeft = 0;
    }
    if (gutterRef) gutterRef.scrollTop = 0;
  }

  onMount(async () => {
    gutter = numbersFor(source);
    if (inputRef) inputRef.value = source;
    langs = getRegisteredLanguages();
    const mySeq = ++seq;
    await paint(lang, source, mySeq);
    // Upgrade to the 100+ line file samples when reachable.
    fileSamples = await loadFileSamples();
    const full = fileSamples?.get(lang);
    if (full && full !== source) {
      setSource(full);
      resetScroll();
      await paint(lang, full, ++seq);
    }
  });

  return (
    <section class="demo" aria-label="Live playground">
      <style>{demoStyles}</style>
      <style>{() => themeCss(theme)}</style>
      <div class="demo-head">
        <h2>Try it live</h2>
        <p>Edit the code or pick a language — highlighted with the real tokenizer.</p>
      </div>
      <div class="demo-grid">
        <aside class="demo-side" aria-label="Languages">
          <input
            class="demo-search"
            type="search"
            placeholder="Filter languages…"
            aria-label="Filter languages"
            oninput={(e) => {
              filter = e.target.value;
            }}
          />
          <div class="demo-langs" role="listbox" aria-label="Supported languages">
            {() =>
              langs
                .filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
                .map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="option"
                    aria-selected={l === lang ? "true" : "false"}
                    class={l === lang ? "demo-lang is-active" : "demo-lang"}
                    onclick={() => selectLanguage(l)}
                  >
                    {l}
                  </button>
                ))
            }
          </div>
        </aside>
        <div class="demo-main">
          <div class="demo-tabbar">
            <span class="demo-tab">{() => `sample.${lang}`}</span>
            <span class="demo-tabright">
              <select
                class="demo-theme"
                aria-label="Syntax theme"
                onchange={(e) => {
                  theme = e.target.value;
                }}
              >
                {() =>
                  THEME_ORDER.map((n) => (
                    <option value={n} selected={n === theme}>
                      {n}
                    </option>
                  ))
                }
              </select>
              <span class="demo-count">{() => `${tokenCount} tokens`}</span>
            </span>
          </div>
          <div class="demo-editor">
            <pre class="demo-gutter" ref={gutterRef} aria-hidden="true">
              {() => gutter}
            </pre>
            <div class="demo-codewrap">
              <pre id="demo-code" class="code-sample demo-code" ref={preRef} aria-hidden="true">
                <code>
                  <RawHtml html={html} />
                </code>
              </pre>
              <textarea
                ref={inputRef}
                class="demo-input"
                aria-label="Editable code sample"
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                oninput={(e) => {
                  source = e.target.value;
                  gutter = numbersFor(source);
                  schedulePaint();
                }}
                onscroll={(e) => {
                  if (preRef) {
                    preRef.scrollTop = e.target.scrollTop;
                    preRef.scrollLeft = e.target.scrollLeft;
                  }
                  if (gutterRef) gutterRef.scrollTop = e.target.scrollTop;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
