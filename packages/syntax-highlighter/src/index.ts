import { Highlighter } from "./core/highlighter.ts";
import { HighlightRenderer } from "./core/renderer.ts";
import { loadLanguage } from "./core/registry.ts";

export { TokenType, WHITESPACE, createToken, isSignificant } from "./core/tokens.ts";
export type { Token } from "./core/tokens.ts";
export type {
  LanguageDefinition,
  LexDefinition,
  StringDef,
  CommentDef,
  RawToken,
} from "./core/lexer.ts";
export { Highlighter } from "./core/highlighter.ts";
export type { TokenizerLike } from "./core/highlighter.ts";
export { HighlightRenderer } from "./core/renderer.ts";
export { HIGHLIGHT_PREFIX } from "./core/renderer.ts";
export { Tokenizer } from "./core/tokenizer.ts";
export { GenericTokenizer } from "./core/generic-tokenizer.ts";
export { Lexer } from "./core/lexer.ts";
export {
  registerLanguage,
  loadLanguage,
  getRegisteredLanguages,
} from "./core/registry.ts";

export interface HighlightOptions {
  language?: string;
}

export interface HighlightHandle {
  highlighter: Highlighter;
  renderer: HighlightRenderer;
  refresh(nextSource: string): void;
  dispose(): void;
}

export async function createHighlighter({
  language = "javascript",
}: HighlightOptions = {}): Promise<Highlighter> {
  const definition = await loadLanguage(language);
  return new Highlighter(definition);
}

export async function highlightElement(
  element: HTMLElement,
  source: string,
  { language = "javascript" }: HighlightOptions = {},
): Promise<HighlightHandle> {
  const highlighter = await createHighlighter({ language });
  const renderer = new HighlightRenderer(element);
  renderer.setText(source);
  renderer.render(highlighter.highlight(source));

  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  return {
    highlighter,
    renderer,
    refresh(nextSource: string) {
      if (disposed) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (disposed) return;
        renderer.setText(nextSource);
        renderer.render(highlighter.highlight(nextSource));
      }, 50);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      renderer.dispose();
    },
  };
}
