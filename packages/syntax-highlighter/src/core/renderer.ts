import { TokenType, WHITESPACE, type Token } from "./tokens.ts";

const HIGHLIGHTABLE = new Set<string>(Object.values(TokenType));

export class HighlightRenderer {
  element: HTMLElement;
  textNode: Text | null = null;
  supported: boolean;

  constructor(element: HTMLElement) {
    this.element = element;
    this.textNode = null;
    this.supported =
      typeof CSS !== "undefined" &&
      !!CSS.highlights &&
      typeof globalThis.Highlight !== "undefined";
  }

  setText(text: string): void {
    const node = document.createTextNode(text);
    this.element.textContent = "";
    this.element.appendChild(node);
    this.textNode = node;
  }

  render(tokens: Token[]): void {
    if (!this.supported || !this.textNode) return;

    const byType = new Map<string, AbstractRange[]>();
    for (const token of tokens) {
      if (token.type === WHITESPACE || !HIGHLIGHTABLE.has(token.type)) continue;
      if (token.end <= token.start) continue;
      let ranges = byType.get(token.type);
      if (!ranges) {
        ranges = [];
        byType.set(token.type, ranges);
      }
      ranges.push(this.#range(token.start, token.end));
    }

    CSS.highlights.clear();
    for (const [type, ranges] of byType) {
      CSS.highlights.set(type, new Highlight(...ranges));
    }
  }

  clear(): void {
    if (this.supported) CSS.highlights.clear();
  }

  #range(start: number, end: number): AbstractRange {
    if (typeof StaticRange === "function") {
      return new StaticRange({
        startContainer: this.textNode!,
        startOffset: start,
        endContainer: this.textNode!,
        endOffset: end,
      });
    }
    const range = document.createRange();
    range.setStart(this.textNode!, start);
    range.setEnd(this.textNode!, end);
    return range;
  }
}
