import { HIGHLIGHTABLE } from "./render-helpers.ts";
import { type Token, WHITESPACE } from "./tokens.ts";
export const HIGHLIGHT_PREFIX = "sh-";

const instances = new Set<CSSHighlightRenderer>();
const ownedHighlights = new Map<string, Highlight>();

function highlightName(type: string): string {
  return `${HIGHLIGHT_PREFIX}${type}`;
}

export class CSSHighlightRenderer {
  element: HTMLElement;
  textNode: Text | null = null;
  supported: boolean;
  #ranges = new Map<string, AbstractRange[]>();

  constructor(element: HTMLElement) {
    this.element = element;
    this.textNode = null;
    this.supported =
      typeof CSS !== "undefined" && !!CSS.highlights && typeof globalThis.Highlight !== "undefined";
    instances.add(this);
  }

  render(source: string, tokens: Token[]): void {
    this.#setText(source);

    if (!this.supported || !this.textNode) return;

    const byType = new Map<string, AbstractRange[]>();
    for (const token of tokens) {
      if (token.type === WHITESPACE || !HIGHLIGHTABLE.has(token.type)) continue;
      if (token.end <= token.start) continue;
      if (token.start < 0 || token.end > source.length) continue;
      let ranges = byType.get(token.type);
      if (!ranges) {
        ranges = [];
        byType.set(token.type, ranges);
      }
      const range = this.#range(token.start, token.end);
      if (range) ranges.push(range);
    }

    this.#ranges = byType;
    this.#apply();
  }

  clear(): void {
    this.#ranges = new Map();
    this.#apply();
  }

  dispose(): void {
    instances.delete(this);
    this.#ranges = new Map();
    this.#apply();
  }

  #setText(text: string): void {
    if (this.textNode?.textContent === text && this.textNode.parentNode === this.element) {
      return;
    }
    const node = document.createTextNode(text);
    this.element.textContent = "";
    this.element.appendChild(node);
    this.textNode = node;
  }

  #apply(): void {
    if (!this.supported) return;

    const merged = new Map<string, AbstractRange[]>();
    for (const instance of instances) {
      for (const [type, ranges] of instance.#ranges) {
        const combined = merged.get(type);
        if (combined) combined.push(...ranges);
        else merged.set(type, [...ranges]);
      }
    }

    for (const [name, highlight] of ownedHighlights) {
      if (CSS.highlights.get(name) === highlight) CSS.highlights.delete(name);
      ownedHighlights.delete(name);
    }
    for (const [type, ranges] of merged) {
      const name = highlightName(type);
      const highlight = new Highlight(...ranges);
      CSS.highlights.set(name, highlight);
      ownedHighlights.set(name, highlight);
    }
  }

  #range(start: number, end: number): AbstractRange | null {
    if (!this.textNode) return null;
    if (typeof StaticRange === "function") {
      return new StaticRange({
        startContainer: this.textNode,
        startOffset: start,
        endContainer: this.textNode,
        endOffset: end,
      });
    }
    const range = document.createRange();
    range.setStart(this.textNode, start);
    range.setEnd(this.textNode, end);
    return range;
  }
}
