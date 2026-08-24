import { CSSHighlightRenderer } from "./core/css-renderer.ts";
import { Highlighter } from "./core/highlighter.ts";
import { loadLanguage } from "./core/registry.ts";

export type { AnsiTheme as AnsiThemeType, AnsiThemeName } from "./ansi/themes/types.ts";
export type { AnsiRenderOptions, AnsiTheme } from "./core/ansi-renderer.ts";
export {
  ANSI_PALETTES,
  ANSI_RESET,
  ANSI_THEMES,
  defaultLight,
  defaultTheme,
  hexToAnsi,
  renderANSI,
} from "./core/ansi-renderer.ts";
export { CSSHighlightRenderer } from "./core/css-renderer.ts";
export {
  type EmbedTokenizerFactory,
  GenericTokenizer,
  type TokenizerLike,
} from "./core/generic-tokenizer.ts";
export { createTokenizer, Highlighter } from "./core/highlighter.ts";
export { renderHTML } from "./core/html-renderer.ts";
export type { HtmlRenderOptions } from "./core/html-renderer.ts";
export { renderJSON, validateTokens } from "./core/json-renderer.ts";
export type {
  CommentDef,
  LanguageDefinition,
  LexDefinition,
  RawToken,
  StringDef,
} from "./core/lexer.ts";
export { Lexer } from "./core/lexer.ts";
export {
  getRegisteredLanguages,
  loadLanguage,
  registerLanguage,
} from "./core/registry.ts";
export { Tokenizer } from "./core/tokenizer.ts";
export type { Token } from "./core/tokens.ts";
export { createToken, isSignificant, TokenType, WHITESPACE } from "./core/tokens.ts";

export interface HighlightOptions {
  language?: string;
  /**
   * How long `refresh()` coalesces successive calls, in milliseconds.
   * `0` re-highlights synchronously on every call.
   */
  debounceMs?: number;
}

export interface HighlightHandle {
  highlighter: Highlighter;
  renderer: CSSHighlightRenderer;
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
  { language = "javascript", debounceMs = 50 }: HighlightOptions = {},
): Promise<HighlightHandle> {
  const highlighter = await createHighlighter({ language });
  const renderer = new CSSHighlightRenderer(element);
  renderer.render(source, highlighter.highlight(source));

  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  return {
    highlighter,
    renderer,
    refresh(nextSource: string) {
      if (disposed) return;
      clearTimeout(timer);
      const paint = () => {
        if (disposed) return;
        renderer.render(nextSource, highlighter.highlight(nextSource));
      };
      if (debounceMs <= 0) paint();
      else timer = setTimeout(paint, debounceMs);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      renderer.dispose();
    },
  };
}
