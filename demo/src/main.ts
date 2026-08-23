/**
 * The browser's entry — named by the `<script type="module">` in index.html.
 *
 * An IDE-style workbench: a title bar with an editor tab, an activity bar, an
 * editor with a line-number gutter, a tabbed bottom panel (tokens / custom
 * language), and a status bar.
 */
import {
  createHighlighter,
  getRegisteredLanguages,
  type Highlighter,
  HighlightRenderer,
  isSignificant,
  type LanguageDefinition,
  registerLanguage,
} from "@opentf/syntax-highlighter";

import { editHint, LEDE, LINKS, SAMPLES, statusMessage } from "./page.ts";

const DEBOUNCE_MS = 60;

/* ------------------------------------------------------------------ icons */

function svg(body: string): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const ICONS = {
  file: svg(
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  ),
  list: svg(
    '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  ),
  code: svg('<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  ),
  moon: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
  contrast: svg(
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/>',
  ),
  info: svg(
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  ),
  chevron: svg('<path d="m6 9 6 6 6-6"/>'),
};

const THEME_MODES = ["auto", "light", "dark"] as const;
const SYNTAX_THEMES = [
  "default",
  "github-light",
  "github-dark",
  "monokai",
  "dracula",
  "nord",
  "solarized-dark",
  "solarized-light",
  "one-dark",
  "gruvbox-dark",
  "tokyo-night",
] as const;
type ThemeMode = (typeof THEME_MODES)[number];
const THEME_ICONS: Record<ThemeMode, string> = {
  auto: ICONS.contrast,
  light: ICONS.sun,
  dark: ICONS.moon,
};
let themeIndex = 0;

/* ----------------------------------------------------------------- helpers */

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

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from the page`);
  return node as T;
}

function activityButton(
  id: string,
  icon: string,
  title: string,
  active = false,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = active ? "activity active" : "activity";
  btn.dataset.panel = id;
  btn.title = title;
  btn.innerHTML = icon;
  return btn;
}

function panelTab(id: string, label: string, icon: string, active = false): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = active ? "panel-tab active" : "panel-tab";
  btn.dataset.tab = id;
  btn.innerHTML = `${icon}<span>${label}</span>`;
  return btn;
}

function labeledSelect(id: string, label: string, options: string[]): HTMLLabelElement {
  const select = document.createElement("select");
  select.id = `select-${id}`;
  for (const option of options) select.add(new Option(option, option));
  const wrap = document.createElement("label");
  wrap.append(label, select);
  return wrap;
}

/* ----------------------------------------------------------------- layout */

const root = document.getElementById("app");
if (!root) throw new Error("index.html has no #app for this module to render into");

root.replaceChildren(
  element("header", { className: "titlebar" }, [
    element("div", { className: "traffic" }, [
      element("span", { className: "dot dot-red" }),
      element("span", { className: "dot dot-yellow" }),
      element("span", { className: "dot dot-green" }),
    ]),
    element("div", { className: "tabbar" }, [
      element("div", { className: "tab active" }, [
        element("span", { className: "tab-file-icon", innerHTML: ICONS.file }),
        element("span", { className: "tab-file", textContent: "index.js" }),
        element("span", { className: "tab-modified", textContent: "●" }),
      ]),
    ]),
    element("div", { className: "titlebar-actions" }, [
      element("button", { id: "theme-toggle", className: "icon-button", title: "Change theme" }),
      element("div", { className: "dropdown" }, [
        element("button", {
          id: "about-toggle",
          className: "icon-button",
          title: "About",
          innerHTML: ICONS.info,
        }),
        element("div", { id: "about-menu", className: "menu", hidden: true }, [
          element("div", { className: "menu-header", textContent: LEDE }),
          ...LINKS.map((l) =>
            element("a", {
              className: "menu-item",
              href: l.href,
              target: "_blank",
              rel: "noreferrer",
              textContent: l.label,
            }),
          ),
          element("span", { className: "menu-hint", textContent: editHint("src/main.ts") }),
        ]),
      ]),
    ]),
  ]),

  element("div", { className: "workbench" }, [
    element("nav", { className: "activitybar" }, [
      activityButton("editor", ICONS.file, "Editor", true),
      activityButton("tokens", ICONS.list, "Tokens"),
      activityButton("custom", ICONS.code, "Custom language"),
    ]),

    element("div", { className: "main" }, [
      element("div", { className: "toolbar" }, [
        element("div", { className: "breadcrumb" }, [
          element("span", { textContent: "src" }),
          element("span", { className: "crumb-sep", textContent: "›" }),
          element("span", { textContent: "index.js" }),
        ]),
        element("span", { className: "spacer" }),
        labeledSelect("language", "Language", []),
        labeledSelect("syntax-theme", "Theme", [...SYNTAX_THEMES] as unknown as string[]),
        labeledSelect(
          "sample",
          "Sample",
          SAMPLES.map((s) => s.name),
        ),
      ]),

      element("div", { className: "editor", id: "editor" }, [
        element("pre", { id: "gutter", className: "gutter", ariaHidden: "true" }),
        element("pre", { id: "highlight-layer", className: "layer highlight", ariaHidden: "true" }),
        element("textarea", {
          id: "input-layer",
          className: "layer input",
          spellcheck: false,
          wrap: "off",
          placeholder: "Type JavaScript…",
        }),
      ]),

      element("section", { className: "panel", id: "panel", hidden: true }, [
        element("div", { className: "panel-header" }, [
          panelTab("tokens", "Tokens", ICONS.list, true),
          panelTab("custom", "Custom language", ICONS.code),
          element("span", { className: "spacer" }),
          element("button", {
            id: "panel-collapse",
            className: "icon-button",
            title: "Close panel",
            innerHTML: ICONS.chevron,
          }),
        ]),
        element("div", { className: "panel-body" }, [
          element("ol", { id: "token-list", className: "token-list" }),
          element("div", { id: "custom-pane", className: "custom-pane", hidden: true }, [
            element("p", {
              className: "hint",
              textContent:
                "Paste a language definition as JSON. Registering it switches the editor to that language.",
            }),
            element("textarea", {
              id: "custom-json",
              className: "custom-json",
              spellcheck: false,
              wrap: "off",
              placeholder:
                '{\n  "name": "minilang",\n  "aliases": ["mini"],\n  "keywords": ["frob"],\n  "operators": ["->>"]\n}',
            }),
            element("button", {
              id: "register",
              className: "button",
              textContent: "Register & switch",
            }),
          ]),
        ]),
      ]),
    ]),
  ]),

  element("footer", { className: "statusbar" }, [
    element("span", { id: "status-left", className: "status-item" }),
    element("span", { className: "status-item", textContent: "utf-8" }),
    element("span", { className: "spacer" }),
    element("span", { id: "status-language", className: "status-item" }),
    element("span", { id: "status-tokens", className: "status-item" }),
    element("span", {
      id: "status-theme",
      className: "status-item status-button",
      title: "Change theme",
    }),
  ]),
);

/* ------------------------------------------------------------- references */

const highlightLayer = byId<HTMLPreElement>("highlight-layer");
const inputLayer = byId<HTMLTextAreaElement>("input-layer");
const gutter = byId<HTMLPreElement>("gutter");
const tokenList = byId<HTMLOListElement>("token-list");
const languageSelect = byId<HTMLSelectElement>("select-language");
const syntaxThemeSelect = byId<HTMLSelectElement>("select-syntax-theme");
const sampleSelect = byId<HTMLSelectElement>("select-sample");
const themeToggle = byId<HTMLButtonElement>("theme-toggle");
const aboutToggle = byId<HTMLButtonElement>("about-toggle");
const aboutMenu = byId<HTMLElement>("about-menu");
const customJson = byId<HTMLTextAreaElement>("custom-json");
const registerBtn = byId<HTMLButtonElement>("register");
const panel = byId<HTMLElement>("panel");
const panelCollapse = byId<HTMLButtonElement>("panel-collapse");
const customPane = byId<HTMLElement>("custom-pane");
const statusLeft = byId<HTMLElement>("status-left");
const statusLanguage = byId<HTMLElement>("status-language");
const statusTokens = byId<HTMLElement>("status-tokens");
const statusTheme = byId<HTMLElement>("status-theme");
const activityButtons = [...document.querySelectorAll<HTMLButtonElement>(".activity")];
const panelTabs = [...document.querySelectorAll<HTMLButtonElement>(".panel-tab")];

/* ------------------------------------------------------- highlight pipeline */

let renderer: HighlightRenderer | null = null;
let currentSource = "";
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let renderSeq = 0;
let activePanel: "editor" | "tokens" | "custom" = "editor";
const highlighters = new Map<string, Promise<Highlighter>>();

/** Drop the memoized highlighter for a language so the next use rebuilds it. */
function invalidateHighlighter(language: string): void {
  highlighters.delete(language.toLowerCase());
  highlighters.delete(language);
}

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

function renderGutter(source: string): void {
  const lineCount = source.split("\n").length;
  const numbers = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n");
  gutter.textContent = `${numbers}\n`;
}

function syncScroll(): void {
  gutter.scrollTop = inputLayer.scrollTop;
  highlightLayer.scrollTop = inputLayer.scrollTop;
  highlightLayer.scrollLeft = inputLayer.scrollLeft;
}

function renderNow(source: string): void {
  currentSource = source;
  const seq = ++renderSeq;
  if (!renderer) return;
  renderer.setText(source);
  renderGutter(source);
  void highlighterFor(languageSelect.value).then((h) => {
    if (seq !== renderSeq || currentSource !== source) return;
    const tokens = h.highlight(source);
    renderer?.render(tokens);
    const significant = tokens.filter((t) => isSignificant(t) && t.end > t.start);
    tokenList.replaceChildren(
      ...significant.map((t) =>
        element("li", {}, [
          element("code", { className: `tk tk-${t.type}`, textContent: t.type }),
          element("code", { className: "tk-text", textContent: source.slice(t.start, t.end) }),
        ]),
      ),
    );
    statusTokens.textContent = `${significant.length} tokens`;
    syncScroll();
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
    statusLanguage.textContent = name;
    renderNow(inputLayer.value);
  } catch (error) {
    setStatus("error", String(error));
  }
}

inputLayer.addEventListener("input", () => queueRender());
inputLayer.addEventListener("scroll", () => syncScroll());

/* --------------------------------------------------------------- controls */

function setStatus(kind: "ok" | "error", text: string): void {
  statusLeft.textContent = `${kind === "ok" ? "✓" : "✗"} ${statusMessage(kind, text)}`;
  statusLeft.classList.toggle("error", kind === "error");
}

function applyTheme(mode: ThemeMode): void {
  if (mode === "auto") delete document.documentElement.dataset.shTheme;
  else document.documentElement.dataset.shTheme = mode;
  themeToggle.innerHTML = THEME_ICONS[mode];
  themeToggle.title = `Theme: ${mode}`;
  statusTheme.textContent = `theme: ${mode}`;
}

function cycleTheme(): void {
  themeIndex = (themeIndex + 1) % THEME_MODES.length;
  applyTheme(THEME_MODES[themeIndex] ?? "auto");
}

function activatePanel(tab: "editor" | "tokens" | "custom"): void {
  activePanel = tab;
  const open = tab !== "editor";
  panel.hidden = !open;

  for (const btn of activityButtons) {
    btn.classList.toggle("active", btn.dataset.panel === tab);
  }
  for (const t of panelTabs) {
    t.classList.toggle("active", open && t.dataset.tab === tab);
  }
  tokenList.hidden = !(open && tab === "tokens");
  customPane.hidden = !(open && tab === "custom");
}

for (const btn of activityButtons) {
  btn.addEventListener("click", () => {
    const target = (btn.dataset.panel ?? "editor") as "editor" | "tokens" | "custom";
    if (target !== "editor" && activePanel === target) {
      activatePanel("editor");
    } else {
      activatePanel(target);
    }
    if (activePanel === "editor") inputLayer.focus();
  });
}

for (const t of panelTabs) {
  t.addEventListener("click", () => {
    const tab = (t.dataset.tab ?? "tokens") as "tokens" | "custom";
    activatePanel(tab);
  });
}

panelCollapse.addEventListener("click", () => activatePanel("editor"));

for (const name of [...getRegisteredLanguages()].sort()) languageSelect.add(new Option(name, name));

languageSelect.addEventListener("change", () => void switchLanguage(languageSelect.value));

syntaxThemeSelect.addEventListener("change", () => {
  const link = document.getElementById("sh-theme") as HTMLLinkElement | null;
  if (link) {
    // dist build serves themes from /assets/, dev serves from node_modules
    const isDist = link.href.includes("/assets/");
    link.href = isDist
      ? `/assets/${syntaxThemeSelect.value}.css`
      : `./node_modules/@opentf/syntax-highlighter/src/themes/${syntaxThemeSelect.value}.css`;
  }
  setStatus("ok", `theme: ${syntaxThemeSelect.value}`);
});

sampleSelect.addEventListener("change", () => {
  const sample = SAMPLES[sampleSelect.selectedIndex];
  if (!sample) return;
  inputLayer.value = sample.source;
  // Keep language in sync with the chosen sample.
  if (sample.language && languageSelect.value !== sample.language) {
    languageSelect.value = sample.language;
    void switchLanguage(sample.language);
  }
  queueRender();
});

themeToggle.addEventListener("click", () => cycleTheme());
statusTheme.addEventListener("click", () => cycleTheme());

aboutToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  aboutMenu.hidden = !aboutMenu.hidden;
});

document.addEventListener("click", () => {
  aboutMenu.hidden = true;
});

registerBtn.addEventListener("click", () => {
  try {
    const definition = JSON.parse(customJson.value) as LanguageDefinition;
    registerLanguage(definition);
    // The definition behind this name just changed; a memoized highlighter
    // built from the previous one would keep tokenizing with stale rules.
    invalidateHighlighter(definition.name);
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
// Start with first sample's language.
if (SAMPLES[0]?.language) languageSelect.value = SAMPLES[0].language;
inputLayer.value = SAMPLES[0]?.source ?? "";
applyTheme("auto");
setStatus("ok", "ready");
activatePanel("editor");
queueRender();
