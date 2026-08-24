import type { LanguageDefinition } from "./lexer.ts";
import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";
import { GenericTokenizer } from "./generic-tokenizer.ts";
import { Tokenizer } from "./tokenizer.ts";
import javascript from "../languages/javascript.ts";
import css from "../languages/css.ts";

const NAME_RE = /[a-zA-Z][a-zA-Z0-9-]*/y;
const ATTR_RE = /[a-zA-Z_:][a-zA-Z0-9_:.-]*/y;
const WS_RE = /\s+/y;

/**
 * HTML tokenizer — tags, attributes, comments, doctype, and raw-text
 * embedding: `<script>` bodies are tokenized with the JavaScript tokenizer
 * and `<style>` bodies with the CSS one. Text content emits `text` tokens so
 * the token stream covers the whole source (JSON contract) while staying
 * visually plain.
 */
export class HtmlTokenizer {
  readonly language: LanguageDefinition;
  #js: Tokenizer | null = null;
  #css: GenericTokenizer | null = null;

  constructor(language: LanguageDefinition) {
    this.language = language;
  }

  tokenize(source: string): Token[] {
    const out: Token[] = [];
    const len = source.length;
    let i = 0;
    const push = (type: Token["type"], start: number, end: number): void => {
      if (end > start) out.push(createToken(type, start, end));
    };

    while (i < len) {
      if (source.startsWith("<!--", i)) {
        const close = source.indexOf("-->", i + 4);
        const stop = close === -1 ? len : close + 3;
        push(TokenType.COMMENT, i, stop);
        i = stop;
        continue;
      }

      if (source[i] !== "<") {
        let j = i + 1;
        while (j < len && source[j] !== "<") j += 1;
        push(TokenType.TEXT, i, j);
        i = j;
        continue;
      }

      // `<!doctype …>` / `<![CDATA[…]]>` / processing instructions
      if (source.startsWith("<!", i)) {
        i = this.#scanBang(source, i, push, ">");
        continue;
      }

      // Processing instruction: `<?xml … ?>`
      if (source.startsWith("<?", i)) {
        i = this.#scanBang(source, i, push, "?>");
        continue;
      }

      // Closing tag: `</name>`
      if (source.startsWith("</", i)) {
        push(TokenType.PUNCTUATION, i, i + 2);
        i += 2;
        NAME_RE.lastIndex = i;
        const m = NAME_RE.exec(source);
        if (m) {
          push(TokenType.TAG, m.index, m.index + m[0].length);
          i = m.index + m[0].length;
        }
        i = this.#skipToClose(source, i, push);
        continue;
      }

      // Opening tag — requires a name, otherwise the `<` is plain text.
      NAME_RE.lastIndex = i + 1;
      const m = NAME_RE.exec(source);
      if (!m || m.index !== i + 1) {
        push(TokenType.TEXT, i, i + 1);
        i += 1;
        continue;
      }

      push(TokenType.PUNCTUATION, i, i + 1);
      const tagName = m[0].toLowerCase();
      push(TokenType.TAG, m.index, m.index + m[0].length);
      i = m.index + m[0].length;

      let selfClosing = false;
      while (i < len) {
        WS_RE.lastIndex = i;
        const ws = WS_RE.exec(source);
        if (ws && ws.index === i) {
          push(WHITESPACE, i, i + ws[0].length);
          i += ws[0].length;
          if (i >= len) break;
        }
        const ch = source[i];
        if (ch === ">") {
          push(TokenType.PUNCTUATION, i, i + 1);
          i += 1;
          break;
        }
        if (ch === "/" && source[i + 1] === ">") {
          push(TokenType.PUNCTUATION, i, i + 2);
          i += 2;
          selfClosing = true;
          break;
        }
        if (ch === "=") {
          push(TokenType.OPERATOR, i, i + 1);
          i += 1;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const close = source.indexOf(ch, i + 1);
          const stop = close === -1 ? len : close + 1;
          push(TokenType.STRING, i, stop);
          i = stop;
          continue;
        }
        ATTR_RE.lastIndex = i;
        const attr = ATTR_RE.exec(source);
        if (attr && attr.index === i) {
          push(TokenType.ATTRIBUTE, i, i + attr[0].length);
          i += attr[0].length;
          continue;
        }
        // Unquoted attribute value or stray character.
        if (ch === "<") {
          push(TokenType.TEXT, i, i + 1);
          i += 1;
          continue;
        }
        let j = i + 1;
        while (j < len && !/[\s=>"'<]/.test(source[j])) j += 1;
        push(TokenType.STRING, i, j);
        i = j;
      }

      if (selfClosing || (tagName !== "script" && tagName !== "style")) continue;

      // Raw-text embedding: delegate the body to the JS/CSS tokenizer.
      const closeRe = new RegExp(`</${tagName}(?=[\\s/>]|$)`, "i");
      closeRe.lastIndex = i;
      const hit = closeRe.exec(source);
      const bodyEnd = hit ? hit.index : len;
      if (bodyEnd > i) {
        const embed =
          tagName === "script"
            ? (this.#js ??= new Tokenizer(javascript))
            : (this.#css ??= new GenericTokenizer(css));
        for (const tok of embed.tokenize(source.slice(i, bodyEnd))) {
          out.push(createToken(tok.type, tok.start + i, tok.end + i));
        }
      }
      i = bodyEnd;
    }

    return out;
  }

  /** `<!doctype html>`, `<![CDATA[…]]>`, `<?xml … ?>` — keyword for names, rest plain. */
  #scanBang(
    source: string,
    start: number,
    push: (type: Token["type"], s: number, e: number) => void,
    terminator: ">" | "?>",
  ): number {
    const len = source.length;
    let i = start + 2;
    push(TokenType.PUNCTUATION, start, i);

    if (source.startsWith("[CDATA[", i)) {
      const close = source.indexOf("]]>", i);
      const stop = close === -1 ? len : close + 3;
      push(TokenType.TEXT, i, stop);
      return stop;
    }

    while (i < len) {
      if (source.startsWith(terminator, i)) {
        push(TokenType.PUNCTUATION, i, i + terminator.length);
        return i + terminator.length;
      }
      const ch = source[i];
      if (ch === "-" && source.startsWith("-->", i)) {
        push(TokenType.PUNCTUATION, i, i + 3);
        return i + 3;
      }
      if (/\s/.test(ch)) {
        let j = i;
        while (j < len && /\s/.test(source[j])) j += 1;
        push(WHITESPACE, i, j);
        i = j;
        continue;
      }
      ATTR_RE.lastIndex = i;
      const word = ATTR_RE.exec(source);
      if (word && word.index === i) {
        push(TokenType.KEYWORD, i, i + word[0].length);
        i += word[0].length;
        continue;
      }
      push(TokenType.TEXT, i, i + 1);
      i += 1;
    }
    return i;
  }

  /** Consume up to and including the closing `>` of a tag's tail (`… >`). */
  #skipToClose(
    source: string,
    start: number,
    push: (type: Token["type"], s: number, e: number) => void,
  ): number {
    const len = source.length;
    let i = start;
    while (i < len && /\s/.test(source[i])) i += 1;
    if (i > start) push(WHITESPACE, start, i);
    if (i < len && source[i] === ">") {
      push(TokenType.PUNCTUATION, i, i + 1);
      return i + 1;
    }
    // Malformed tail — consume through the next `>` (or EOF) as plain text.
    const gt = source.indexOf(">", i);
    const stop = gt === -1 ? len : gt + 1;
    if (stop > i) push(TokenType.TEXT, i, stop);
    return stop;
  }
}
