/**
 * The browser's entry — named by the `<script type="module">` in index.html.
 *
 * The whole playground: an editor whose text is highlighted live, a token
 * stream panel, and the controls — language, theme, samples, custom language
 * definitions.
 */
import {
  createHighlighter,
  getRegisteredLanguages,
  registerLanguage,
  HighlightRenderer,
  type Highlighter,
  type LanguageDefinition,
} from "@opentf/syntax-highlighter";

import { LEDE, LINKS, SAMPLES, editHint, statusMessage } from "./page.ts";


const DEBOUNCE_MS = 60;

const THEME_MODES = ["auto", "light", "dark"] as const;
type ThemeMode = (typeof THEME_MODES)[number];
const THEME_LABELS: Record<ThemeMode, string> = {
  auto: "◐ theme: auto",
  light: "☀ theme: light",
  dark: "☾ theme: dark",
};
let themeIndex = 0;

/* ------------------------------------------------------------------ layout */

const root = document.getElementById("app");
if (!root) throw new Error("index.html has no #app for this module to render into");

root.replaceChildren(
  element("header", { className: "bar" }, [
    element("strong", { textContent: "syntax-highlighter" }),
    element("span", { className: "lede", textContent: LEDE }),
  ]),
  element("div", { className: "controls" }, [
    labeledSelect("language", []),
    labeledSelect("sample", SAMPLES.map((s) => s.name)),
    element("button", { id: "theme-toggle", textContent: THEME_LABELS.auto }),
    element("button", { id: "toggle-custom", textContent: "custom language…" }),
    element("output", { id: "status", className: "status" }),
  ]),
  element("main", { className: "grid" }, [
    element("section", { className: "pane editor-pane" }, [
      element("div", { id: "editor", className: "editor" }, [
        element("pre", { id: "highlight-layer", className: "layer", ariaHidden: "true" }),
        element("textarea", {
          id: "input-layer",
          className: "layer input",
          spellcheck: false,
          placeholder: "Type JavaScript…",
        }),
      ]),
    ]),
    element("aside", { className: "pane tokens-pane" }, [
      element("h2", { textContent: "tokens" }),
      element("ol", { id: "token-list", className: "token-list" }),
    ]),
    element("section", { id: "custom-pane", className: "pane custom-pane", hidden: true }, [
      element("h2", { textContent: "custom language definition (JSON)" }),
      element("textarea", {
        id: "custom-json",
        className: "custom-json",
        spellcheck: false,
        rows: 14,
        placeholder:
          '{\n  "name": "minilang",\n  "aliases": ["mini"],\n  "keywords": ["frob"],\n  "operators": ["->>"]\n}',
      }),
      element("button", { id: "register", textContent: "register & switch" }),
    ]),
  ]),
  element("footer", { className: "bar foot" }, [
    element(
      "nav",
      { className: "links" },
      LINKS.map((l) => element("a", { href: l.href, textContent: l.label })),
    ),
    element("span", { className: "edit", textContent: editHint("src/main.ts") }),
  ]),
);

const highlightLayer = byId<HTMLPreElement>("highlight-layer");
const inputLayer = byId<HTMLTextAreaElement>("input-layer");
const tokenList = byId<HTMLOListElement>("token-list");
const languageSelect = byId<HTMLSelectElement>("select-language");
const sampleSelect = byId<HTMLSelectElement>("select-sample");
const themeToggle = byId<HTMLButtonElement>("theme-toggle");
const statusOut = byId<HTMLOutputElement>("status");
const customToggle = byId<HTMLButtonElement>("toggle-custom");
const customPane = byId<HTMLElement>("custom-pane");
const customJson = byId<HTMLTextAreaElement>("custom-json");
const registerBtn = byId<HTMLButtonElement>("register");

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  properties: Partial<HTMLElementTagNameMap[K]> = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, properties);
  node.append(...children);
  return node;
}

function labeledSelect(id: string, options: string[]): HTMLLabelElement {
  const select = document.createElement("select");
  select.id = `select-${id}`;
  for (const option of options) select.add(new Option(option, option));
  const wrap = document.createElement("label");
  wrap.append(`${id}: `, select);
  return wrap;
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from the page`);
  return node as T;
}

function setStatus(kind: "ok" | "error", text: string): void {
  statusOut.value = statusMessage(kind, text);
  statusOut.className = kind === "ok" ? "status ok" : "status error";
}

/* ------------------------------------------------------- highlight pipeline */

let renderer: HighlightRenderer | null = null;
let currentSource = "";
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let renderSeq = 0;
const highlighters = new Map<string, Promise<Highlighter>>();

function highlighterFor(language: string): Promise<Highlighter> {
  let pending = highlighters.get(language);
  if (!pending) {
    pending = createHighlighter({ language });
    highlighters.set(language, pending);
    void pending.catch(() => {
      if (highlighters.get(language) === pending) highlighters.delete(language);
    });
  }
  return pending;
}

function renderNow(source: string): void {
  currentSource = source;
  const seq = ++renderSeq;
  if (!renderer) return;
  renderer.setText(source);
  void highlighterFor(languageSelect.value).then((h) => {
    if (seq !== renderSeq || currentSource !== source) return;
    const tokens = h.highlight(source);
    renderer!.render(tokens);
    tokenList.replaceChildren(
      ...tokens
        .filter((t) => t.end > t.start)
        .map((t) =>
          element("li", {}, [
            element("code", { className: `tk tk-${t.type}`, textContent: t.type }),
            element("code", {
              className: "tk-text",
              textContent: source.slice(t.start, t.end),
            }),
          ]),
        ),
    );
  });
}

function queueRender(): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => renderNow(inputLayer.value), DEBOUNCE_MS);
}

async function switchLanguage(name: string): Promise<void> {
  try {
    await highlighterFor(name);
    setStatus("ok", `language: ${name}`);
    renderNow(inputLayer.value);
  } catch (error) {
    setStatus("error", String(error));
  }
}

inputLayer.addEventListener("input", () => queueRender());
inputLayer.addEventListener("scroll", () => {
  highlightLayer.scrollTop = inputLayer.scrollTop;
  highlightLayer.scrollLeft = inputLayer.scrollLeft;
});

/* --------------------------------------------------------------- controls */

for (const name of getRegisteredLanguages()) languageSelect.add(new Option(name, name));
if (languageSelect.options.length === 0) languageSelect.add(new Option("javascript", "javascript"));

languageSelect.addEventListener("change", () => void switchLanguage(languageSelect.value));

sampleSelect.addEventListener("change", () => {
  const sample = SAMPLES[sampleSelect.selectedIndex];
  if (!sample) return;
  inputLayer.value = sample.source;
  queueRender();
});

themeToggle.addEventListener("click", () => {
  themeIndex = (themeIndex + 1) % THEME_MODES.length;
  const mode = THEME_MODES[themeIndex] ?? "auto";
  if (mode === "auto") delete document.documentElement.dataset.shTheme;
  else document.documentElement.dataset.shTheme = mode;
  themeToggle.textContent = THEME_LABELS[mode];
});

customToggle.addEventListener("click", () => {
  customPane.hidden = !customPane.hidden;
});

registerBtn.addEventListener("click", () => {
  try {
    const definition = JSON.parse(customJson.value) as LanguageDefinition;
    registerLanguage(definition);
    if (![...languageSelect.options].some((o) => o.value === definition.name)) {
      languageSelect.add(new Option(definition.name, definition.name));
    }
    languageSelect.value = definition.name;
    void switchLanguage(definition.name);
  } catch (error) {
    setStatus("error", error instanceof Error ? error.message : String(error));
  }
});

/* ------------------------------------------------------------------ boot */

renderer = new HighlightRenderer(highlightLayer);
inputLayer.value = SAMPLES[0]?.source ?? "";
setStatus("ok", "ready");
queueRender();
