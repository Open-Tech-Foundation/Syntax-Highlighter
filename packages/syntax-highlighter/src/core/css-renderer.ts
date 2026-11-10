import { HIGHLIGHTABLE, tokenStyleName } from "./render-helpers.ts";
import { type Token, WHITESPACE } from "./tokens.ts";
export const HIGHLIGHT_PREFIX = "sh-";

/**
 * One `Highlight` per style name, shared by every renderer on the page. Each
 * renderer adds and removes only its own ranges, so re-rendering one code
 * block costs O(its ranges) rather than rebuilding every block's highlights.
 */
const shared = new Map<string, Highlight>();

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
  }

  render(source: string, tokens: Token[]): void {
    this.#setText(source);

    if (!this.supported || !this.textNode) return;

    const byType = new Map<string, AbstractRange[]>();
    for (const token of tokens) {
      if (token.type === WHITESPACE || !HIGHLIGHTABLE.has(token.type)) continue;
      if (token.end <= token.start) continue;
      if (token.start < 0 || token.end > source.length) continue;
      const styleName = tokenStyleName(token);
      let ranges = byType.get(styleName);
      if (!ranges) {
        ranges = [];
        byType.set(styleName, ranges);
      }
      const range = this.#range(token.start, token.end);
      if (range) ranges.push(range);
    }

    this.#replace(byType);
  }

  clear(): void {
    this.#replace(new Map());
  }

  dispose(): void {
    this.#replace(new Map());
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

  /** Swap this renderer's ranges for `next` in the shared highlights. */
  #replace(next: Map<string, AbstractRange[]>): void {
    if (this.supported) {
      for (const [style, ranges] of this.#ranges) {
        const name = highlightName(style);
        const highlight = shared.get(name);
        if (!highlight) continue;
        for (const range of ranges) highlight.delete(range);
        if (highlight.size === 0) {
          if (CSS.highlights.get(name) === highlight) CSS.highlights.delete(name);
          shared.delete(name);
        }
      }
      for (const [style, ranges] of next) {
        if (ranges.length === 0) continue;
        const name = highlightName(style);
        let highlight = shared.get(name);
        if (!highlight) {
          highlight = new Highlight();
          shared.set(name, highlight);
        }
        for (const range of ranges) highlight.add(range);
        // Re-register if something else replaced the entry under our name.
        if (CSS.highlights.get(name) !== highlight) CSS.highlights.set(name, highlight);
      }
    }
    this.#ranges = next;
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
