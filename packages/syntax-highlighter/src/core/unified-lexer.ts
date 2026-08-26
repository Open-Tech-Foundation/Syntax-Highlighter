import type { LanguageDefinition, RawToken, RawTokenType, StringDef } from "./lexer.ts";
import { Lexer } from "./lexer.ts";

const NAME_RE = /[a-zA-Z][a-zA-Z0-9-]*/y;
const ATTR_NAME_RE = /[a-zA-Z_:][a-zA-Z0-9_:.-]*/y;
const WS_RE = /\s+/y;

/**
 * Lexer subclass that adds markup-aware tokenization. When
 * `language.markup.tags` is true, `tokenize()` scans HTML/XML structure
 * (tag names, attributes, text content, comments, doctype, CDATA, embedded
 * raw-text bodies) and emits `tag`, `attribute`, and `text` raw tokens
 * alongside the standard code tokens.
 *
 * When `markup.tags` is false or absent, behaves identically to the base
 * Lexer — all source is scanned as code.
 */
export class UnifiedLexer extends Lexer {
  private markupTags: boolean;
  private embed?: Record<string, LanguageDefinition>;
  /** Embedded regions: [bodyStart, bodyEnd, embedDef] — populated during tokenize(). */
  embedRegions: Array<[number, number, LanguageDefinition]> = [];

  constructor(language: Partial<LanguageDefinition> = {}) {
    super(language);
    this.markupTags = language.markup?.tags === true;
    this.embed = language.markup?.embed;
  }

  override tokenize(source: string): RawToken[] {
    if (this.markupTags) return this.#scanMarkup(source);
    return super.tokenize(source);
  }

  // ------------------------------------------------------------------
  // Markup scanning — produces tag/attribute/text/comment/whitespace
  // raw tokens by scanning the source character-by-character.
  // ------------------------------------------------------------------

  #scanMarkup(source: string): RawToken[] {
    this.embedRegions.length = 0;
    // Snapshot base state for re-entrancy safety.
    const saved = { source: this.source, length: this.length, pos: this.pos };
    this.source = source;
    this.length = source.length;
    this.pos = 0;

    const tokens: RawToken[] = [];
    const push = (type: RawTokenType, start: number, end: number): void => {
      if (end > start)
        tokens.push({
          type,
          start,
          end,
          value: source.slice(start, end),
        });
    };

    try {
      let i = 0;
      const len = source.length;

      while (i < len) {
        // ---- HTML comment: <!-- ... -->
        if (source.startsWith("<!--", i)) {
          const close = source.indexOf("-->", i + 4);
          const stop = close === -1 ? len : close + 3;
          push("comment", i, stop);
          i = stop;
          continue;
        }

        // ---- Text until next '<'
        if (source[i] !== "<") {
          let j = i + 1;
          while (j < len && source[j] !== "<") j += 1;
          push("text", i, j);
          i = j;
          continue;
        }

        // ---- <!doctype …> / <![CDATA[…]]> / processing instructions
        if (source.startsWith("<!", i)) {
          i = this.#scanBang(source, i, push, ">");
          continue;
        }
        if (source.startsWith("<?", i)) {
          i = this.#scanBang(source, i, push, "?>");
          continue;
        }

        // ---- Closing tag: </name>
        if (source.startsWith("</", i)) {
          push("punctuation", i, i + 2);
          i += 2;
          NAME_RE.lastIndex = i;
          const m = NAME_RE.exec(source);
          if (m && m.index === i) {
            push("tag", m.index, m.index + m[0].length);
            i = m.index + m[0].length;
          }
          i = this.#skipToClose(source, i, push);
          continue;
        }

        // ---- Opening tag — requires a name after '<'
        NAME_RE.lastIndex = i + 1;
        const m = NAME_RE.exec(source);
        if (!m || m.index !== i + 1) {
          push("text", i, i + 1);
          i += 1;
          continue;
        }

        push("punctuation", i, i + 1);
        const tagName = m[0].toLowerCase();
        push("tag", m.index, m.index + m[0].length);
        i = m.index + m[0].length;

        // ---- Scan attributes inside the tag
        let selfClosing = false;
        while (i < len) {
          WS_RE.lastIndex = i;
          const ws = WS_RE.exec(source);
          if (ws && ws.index === i) {
            push("whitespace", i, i + ws[0].length);
            i += ws[0].length;
            if (i >= len) break;
          }
          const ch = source[i];
          if (ch === ">") {
            push("punctuation", i, i + 1);
            i += 1;
            break;
          }
          if (ch === "/" && source[i + 1] === ">") {
            push("punctuation", i, i + 2);
            i += 2;
            selfClosing = true;
            break;
          }
          if (ch === "=") {
            push("operator", i, i + 1);
            i += 1;
            continue;
          }
          if (ch === '"' || ch === "'") {
            // Reuse the Lexer's string scanning for attribute values.
            this.source = source;
            this.pos = i;
            const strDef = this.strings.find((s: StringDef) => s.open === ch);
            if (strDef) {
              this.scanString(strDef);
              const end = this.pos;
              tokens.push({
                type: "string",
                start: i,
                end,
                value: source.slice(i, end),
                detail: { quote: ch },
              });
              i = end;
            } else {
              // Fallback: find closing quote manually.
              const close = source.indexOf(ch, i + 1);
              const stop = close === -1 ? len : close + 1;
              push("string", i, stop);
              i = stop;
            }
            continue;
          }
          ATTR_NAME_RE.lastIndex = i;
          const attr = ATTR_NAME_RE.exec(source);
          if (attr && attr.index === i) {
            push("attribute", i, i + attr[0].length);
            i += attr[0].length;
            continue;
          }
          if (ch === "<") {
            push("text", i, i + 1);
            i += 1;
            continue;
          }
          // Unquoted attribute value or stray character.
          let j = i + 1;
          while (j < len && !/[\s=>"'<]/.test(source[j])) j += 1;
          push("string", i, j);
          i = j;
        }

        // ---- Embedded raw-text body (<script>, <style>)
        if (!selfClosing) i = this.#scanEmbedBody(source, i, tagName, tokens);
      }

      return tokens;
    } finally {
      this.source = saved.source;
      this.length = saved.length;
      this.pos = saved.pos;
    }
  }

  /** Scan `<!doctype …>`, `<![CDATA[…]]>`, `<?xml … ?>` constructs. */
  #scanBang(
    source: string,
    start: number,
    push: (type: RawTokenType, s: number, e: number) => void,
    terminator: ">" | "?>",
  ): number {
    const len = source.length;
    let i = start + 2;
    push("punctuation", start, i);

    if (source.startsWith("[CDATA[", i)) {
      const close = source.indexOf("]]>", i);
      const stop = close === -1 ? len : close + 3;
      push("text", i, stop);
      return stop;
    }

    while (i < len) {
      if (source.startsWith(terminator, i)) {
        push("punctuation", i, i + terminator.length);
        return i + terminator.length;
      }
      const ch = source[i];
      if (ch === "-" && source.startsWith("-->", i)) {
        push("punctuation", i, i + 3);
        return i + 3;
      }
      if (/\s/.test(ch)) {
        let j = i;
        while (j < len && /\s/.test(source[j])) j += 1;
        push("whitespace", i, j);
        i = j;
        continue;
      }
      ATTR_NAME_RE.lastIndex = i;
      const word = ATTR_NAME_RE.exec(source);
      if (word && word.index === i) {
        push("tag", i, i + word[0].length);
        i += word[0].length;
        continue;
      }
      push("text", i, i + 1);
      i += 1;
    }
    return i;
  }

  /** Consume up to and including the closing `>` of a tag's tail. */
  #skipToClose(
    source: string,
    start: number,
    push: (type: RawTokenType, s: number, e: number) => void,
  ): number {
    const len = source.length;
    let i = start;
    while (i < len && /\s/.test(source[i])) i += 1;
    if (i > start) push("whitespace", start, i);
    if (i < len && source[i] === ">") {
      push("punctuation", i, i + 1);
      return i + 1;
    }
    const gt = source.indexOf(">", i);
    const stop = gt === -1 ? len : gt + 1;
    if (stop > i) push("text", i, stop);
    return stop;
  }

  /**
   * If `tagName` maps to an embed definition in `markup.embed`, scan the
   * raw-text body with the embedded language's lexer and emit those tokens
   * with adjusted offsets.
   */
  #scanEmbedBody(source: string, start: number, tagName: string, tokens: RawToken[]): number {
    if (!this.embed) return start;
    const embedDef = this.embed[tagName];
    if (!embedDef) return start;

    const closeRe = new RegExp(`</${tagName}(?=[\\s/>]|$)`, "i");
    closeRe.lastIndex = start;
    const hit = closeRe.exec(source);
    const bodyEnd = hit ? hit.index : source.length;
    if (bodyEnd <= start) return start;

    // Use the base Lexer's code tokenizer for the embedded body.
    const bodyLexer = new Lexer(embedDef);
    const bodyTokens = bodyLexer.tokenize(source.slice(start, bodyEnd));
    for (const t of bodyTokens) {
      tokens.push({ ...t, start: t.start + start, end: t.end + start });
    }
    this.embedRegions.push([start, bodyEnd, embedDef]);
    return bodyEnd;
  }
}
