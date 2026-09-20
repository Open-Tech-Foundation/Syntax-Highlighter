// Hero renderer showcase: auto-rotating tabs (HTML / CSS Highlights /
// Terminal) cycling through code chunks and syntax themes, all powered by
// the real tokenizer. Manual selection restarts the rotation; hovering
// pauses it.
import {
  ANSI_THEMES,
  createHighlighter,
  highlightElement,
  renderANSI,
  renderHTML,
} from "@opentf/syntax-highlighter";
import { onMount, RawHtml } from "@opentf/web";

import { heroTabsStyles } from "./hero-tabs-styles.js";
import { FALLBACKS, FONT_STYLES, isDarkTheme, themeForeground, tokenRules } from "./theme-css.js";

const CHUNKS = [
  {
    language: "typescript",
    label: "demo.ts",
    source:
      "type Token = { type: string; start: number; end: number };\n" +
      "\n" +
      "class Highlighter {\n" +
      "  private cache = new Map<string, Token[]>();\n" +
      "\n" +
      "  constructor(private language = 'typescript') {}\n" +
      "\n" +
      "  highlight(src: string): Token[] {\n" +
      "    const hit = this.cache.get(src);\n" +
      "    if (hit) return hit;\n" +
      "    const toks = tokenize(this.language, src);\n" +
      "    this.cache.set(src, toks);\n" +
      "    return toks;\n" +
      "  }\n" +
      "}\n",
  },
  {
    language: "python",
    label: "demo.py",
    source:
      "from collections import Counter\n" +
      "\n" +
      "def top_kinds(spans, k=3):\n" +
      "    counts = Counter(s.kind for s in spans)\n" +
      "    return counts.most_common(k)\n" +
      "\n" +
      "\n" +
      "def report(path):\n" +
      "    src = path.read_text(encoding='utf-8')\n" +
      "    for kind, n in top_kinds(tokenize(src)):\n" +
      "        print(f'{kind:<10} {n:>5}')\n" +
      "\n" +
      "\n" +
      "if __name__ == '__main__':\n" +
      "    report(Path('demo.py'))\n",
  },
  {
    language: "bash",
    label: "demo.sh",
    source:
      "#!/usr/bin/env bash\n" +
      "set -euo pipefail\n" +
      "\n" +
      "SRC=${1:-demo.sh}\n" +
      "OUT=${2:-out.html}\n" +
      "\n" +
      'if [[ ! -f "$SRC" ]]; then\n' +
      '  echo "missing: $SRC" >&2\n' +
      "  exit 1\n" +
      "fi\n" +
      "\n" +
      'highlight --format html "$SRC" > "$OUT"\n' +
      'echo "wrote $OUT ($(wc -l < "$OUT") lines)"\n',
  },
  {
    language: "json",
    label: "demo.json",
    source:
      "{\n" +
      '  "name": "demo",\n' +
      '  "language": "typescript",\n' +
      '  "theme": "dracula",\n' +
      '  "options": {\n' +
      '    "debounceMs": 50,\n' +
      '    "wrapWhitespace": false\n' +
      "  },\n" +
      '  "tags": ["demo", "tokens"],\n' +
      '  "enabled": true,\n' +
      '  "retries": 3,\n' +
      '  "ratio": 0.975\n' +
      "}\n",
  },
];
// ::highlight() colors for the live CSS-API panel (no spans there).
function highlightRules(name) {
  const t = ANSI_THEMES[name] ?? ANSI_THEMES.default;
  const pick = (...keys) => keys.map((k) => t[k]).find((v) => v != null);
  let css = "";
  for (const [k, v] of Object.entries(t)) {
    if (k === "whitespace") continue;
    css += `::highlight(sh-${k}){color:${v}}`;
  }
  for (const [suffix, chain] of Object.entries(FALLBACKS)) {
    if (t[suffix] != null) continue;
    const v = pick(...chain);
    if (v == null) continue;
    css += `::highlight(sh-${suffix}){color:${v}}`;
  }
  for (const [suffix, style] of Object.entries(FONT_STYLES)) {
    css += `::highlight(sh-${suffix}){${style}}`;
  }
  return css;
}

// A visible mix of dark and light themes.
const THEME_CYCLE = ["default", "dracula", "github-light", "monokai", "nord"];

const TABS = ["HTML", "CSS Highlights", "Terminal"];
const ROTATE_MS = 5000;

function esc(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// Panel chrome follows the theme so dark text never sits on a dark
// background (and vice versa).
function heroChrome(name) {
  const t = ANSI_THEMES[name] ?? ANSI_THEMES.default;
  const bg = isDarkTheme(name) ? "#0b1120" : "#ffffff";
  const fg = themeForeground(t);
  return (
    `.hero-panels{background:${bg}}` +
    `.hero-term{background:${bg}}` +
    `#hero-code{color:${fg}}#hero-code .token.text{color:${fg}}`
  );
}

export default function HeroTabs() {
  let tab = $state(0);
  let chunk = $state(0);
  let themeName = $state(THEME_CYCLE[0]);
  let html = $state(esc(CHUNKS[0].source));

  const termRef = $ref();
  const cssRef = $ref();

  const highlighters = new Map();
  let term = null;
  let cssHandle = null;
  let ansiText = "";
  let timer = null;
  let seq = 0;

  // Live CSS Custom Highlights panel: no spans, the browser paints ranges.
  async function paintCss(source, language, mySeq) {
    if (!cssRef) return;
    if (cssHandle) {
      cssHandle.dispose();
      cssHandle = null;
    }
    const handle = await highlightElement(cssRef, source, { language, debounceMs: 0 });
    if (mySeq !== seq) {
      handle.dispose();
      return;
    }
    cssHandle = handle;
  }

  async function paintChunk(mySeq) {
    const { language, source } = CHUNKS[chunk];
    let h = highlighters.get(language);
    if (!h) {
      h = await createHighlighter({ language });
      highlighters.set(language, h);
    }
    if (mySeq !== seq) return;
    const toks = h.highlight(source);
    html = renderHTML(source, toks, { prefix: "token " });
    ansiText = renderANSI(source, toks, {
      theme: ANSI_THEMES[themeName] ?? ANSI_THEMES.default,
      color: true,
    });
    // The CSS tab tracks the chunk too: same source, native highlights.
    paintCss(source, language, mySeq);
    if (tab === 2) paintTerminal();
  }

  function paintTerminal() {
    if (!termRef) return;
    const dark = isDarkTheme(themeName);
    const bg = dark ? "#0b1120" : "#ffffff";
    const fg = themeForeground(ANSI_THEMES[themeName] ?? ANSI_THEMES.default);
    if (!term) return;
    term.options.theme = { ...term.options.theme, background: bg, foreground: fg, cursor: fg };
    // Repaint on every show: the canvas does not survive display:none.
    term.clear();
    term.write(`$ highlight ${CHUNKS[chunk].label}\r\n${ansiText}`);
  }

  async function initTerminal() {
    if (term || !termRef) return;
    const { Terminal } = await import("@xterm/xterm");
    if (term || !termRef) return;
    term = new Terminal({
      cols: 56,
      rows: 16,
      fontSize: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      cursorBlink: true,
      cursorStyle: "bar",
      disableStdin: true,
      convertEol: true,
      theme: { background: "#0b1120", foreground: "#dbe4f5", cursor: "#7dd3fc" },
    });
    term.open(termRef);
    paintTerminal();
  }

  function nextChunk() {
    chunk = (chunk + 1) % CHUNKS.length;
    themeName = THEME_CYCLE[(THEME_CYCLE.indexOf(themeName) + 1) % THEME_CYCLE.length];
    paintChunk(++seq);
  }

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function restart() {
    stop();
    timer = setTimeout(() => show(tab + 1, true), ROTATE_MS);
  }

  function show(i, auto = false) {
    const next = (i + TABS.length) % TABS.length;
    if (auto && next === 0 && tab !== 0) nextChunk();
    tab = next;
    if (tab === 2) {
      if (term) paintTerminal();
      else initTerminal();
    }
    restart();
  }

  onMount(async () => {
    const ts = await createHighlighter({ language: "typescript" });
    highlighters.set("typescript", ts);
    await paintChunk(++seq);
    restart();
    return () => {
      stop();
      try {
        term?.dispose();
      } catch {
        // already gone
      }
      term = null;
      try {
        cssHandle?.dispose();
      } catch {
        // already gone
      }
      cssHandle = null;
    };
  });

  return (
    <section
      class="editor-shell hero-tabs"
      aria-label="Renderer showcase"
      onmouseenter={stop}
      onmouseleave={restart}
    >
      <style>{heroTabsStyles}</style>
      <style>{() => tokenRules(themeName, "hero-code") + heroChrome(themeName)}</style>
      <style>{() => highlightRules(themeName)}</style>
      <div class="editor-topbar">
        <div class="window-dots">
          <i />
          <i />
          <i />
        </div>
        <div class="hero-tablist" role="tablist" aria-label="Output format">
          {() =>
            TABS.map((label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={i === tab ? "true" : "false"}
                class={i === tab ? "hero-tab is-active" : "hero-tab"}
                onclick={() => show(i)}
              >
                {label}
              </button>
            ))
          }
        </div>
      </div>
      <div class="hero-panels" id="hero-code">
        <pre class={tab === 0 ? "code-sample" : "code-sample is-hidden"}>
          <code>
            <RawHtml html={html} />
          </code>
        </pre>
        <pre class={tab === 1 ? "code-sample" : "code-sample is-hidden"}>
          <code ref={cssRef} />
        </pre>
        <div
          class={tab === 2 ? "hero-term" : "hero-term is-hidden"}
          ref={termRef}
          role="log"
          aria-label="Terminal output"
        />
      </div>
      <div class="editor-footer">
        <span>
          <i class="status-dot" />
          {() => `${CHUNKS[chunk].label} · ${themeName}`}
        </span>
      </div>
    </section>
  );
}
