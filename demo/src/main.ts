/**
 * The browser's entry — named by the `<script type="module">` in index.html.
 *
 * It renders the page you are looking at, and it is the whole application:
 * there is no framework here and nothing else running. Replace it with yours.
 */
import "@opentf/syntax-highlighter/themes/dark.css";
import { highlightElement } from "@opentf/syntax-highlighter";

import { LEDE, LINKS, editHint } from "./page.ts";

const root = document.getElementById("app");
if (!root) {
  throw new Error("index.html has no #app for this module to render into");
}

const SAMPLE = `import { createHighlighter } from "@opentf/syntax-highlighter";

// Native ranges, semantic highlights — the DOM is never touched.
const highlighter = await createHighlighter({ language: "javascript" });

class Widget extends Base {
  #count = 0;
  render(target) {
    const re = /widget-\\d+/g;
    return \`\${target}: \${this.#count} @ \${re.source}\`;
  }
}

const versions = [0xFF, 0b1010, 1_000, 1.5e-3, 10n];
export default highlighter;`;

const code = document.createElement("pre");
code.className = "code-demo";
highlightElement(code, SAMPLE);

root.replaceChildren(
  element("h1", { textContent: "Syntax Highlighter" }),
  element("p", { className: "lede", textContent: LEDE }),
  code,
  element("p", { className: "edit", textContent: editHint("src/main.ts") }),
  element(
    "nav",
    { className: "links" },
    LINKS.map((link) => element("a", { href: link.href, textContent: link.label })),
  ),
);

/**
 * A small `createElement`, typed.
 *
 * `textContent` is a *property*, never `innerHTML`, so a string that came from
 * somewhere else is text and can never be markup.
 */
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
