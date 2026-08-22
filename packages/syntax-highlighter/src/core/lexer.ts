export type ScanNumberFn = (source: string, pos: number) => number;

export interface StringDef {
  open: string;
  close: string;
  escape?: string;
  multiline?: boolean;
  template?: boolean;
}

export interface CommentDef {
  open: string;
  close: string;
  line?: boolean;
}

export interface LexDefinition {
  strings?: StringDef[];
  comments?: CommentDef[];
  identifierStart?: RegExp;
  identifierPart?: RegExp;
  operators?: string[];
  punctuation?: string[];
  regex?: boolean;
  regexAfterParenKeywords?: string[];
  shebang?: boolean;
  scanNumber?: ScanNumberFn;
}

export interface LanguageDefinition {
  name: string;
  aliases?: string[];
  keywords?: string[];
  booleans?: string[];
  nulls?: string[];
  constants?: string[];
  regexKeywords?: string[];
  operators?: string[];
  punctuation?: string[];
  /** Semantic classifier. Defaults to `generic`; JavaScript opts into `javascript`. */
  semantic?: "javascript" | "generic";
  lex?: LexDefinition;
}

export type RawTokenType =
  | "whitespace"
  | "identifier"
  | "number"
  | "string"
  | "regex"
  | "comment"
  | "decorator"
  | "operator"
  | "punctuation";

export interface RawTokenDetail {
  quote?: string;
  unterminated?: boolean;
  kind?: "line" | "block";
  templateOpen?: boolean;
  templateClose?: boolean;
  controlClose?: boolean;
  unknown?: boolean;
}

export interface RawToken {
  type: RawTokenType;
  start: number;
  end: number;
  value: string;
  detail?: RawTokenDetail;
}

const DEFAULT_IDENTIFIER_START = /[$_\p{ID_Start}]/u;
const DEFAULT_IDENTIFIER_PART = /[$_\u200C\u200D\p{ID_Continue}]/u;

function sortByLengthDesc(items: string[]): string[] {
  return [...items].sort((a, b) => b.length - a.length);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isHexDigit(ch: string): boolean {
  return isDigit(ch) || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
}

function isAlpha(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function isWhitespaceChar(ch: string): boolean {
  return (
    ch === " " ||
    ch === "\t" ||
    ch === "\n" ||
    ch === "\r" ||
    ch === "\f" ||
    ch === "\v" ||
    ch === "\u00a0" ||
    ch === "\ufeff"
  );
}

function codePointWidthAt(source: string, pos: number): number {
  return (source.codePointAt(pos) ?? 0) > 0xffff ? 2 : 1;
}

function matches(re: RegExp, value: string): boolean {
  re.lastIndex = 0;
  return re.test(value);
}

/** Index a list of tokens by their first character, longest-first. */
function indexByFirstChar(items: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (!item) continue;
    const ch = item[0];
    const arr = map.get(ch);
    if (arr) arr.push(item);
    else map.set(ch, [item]);
  }
  for (const arr of map.values()) arr.sort((a, b) => b.length - a.length);
  return map;
}

/** Compile `identifierStart identifierPart*` into a single sticky regex. */
function buildIdentifierRe(start: RegExp, part: RegExp): RegExp {
  const flags = new Set([...start.flags, ...part.flags]);
  flags.delete("g");
  flags.add("u");
  flags.add("y");
  return new RegExp(`(?:${start.source})(?:${part.source})*`, [...flags].sort().join(""));
}

export function defaultScanNumber(source: string, pos: number): number {
  const len = source.length;
  let i = pos;
  const eat = (pred: (c: string) => boolean) => {
    while (i < len && (pred(source[i]) || source[i] === "_")) i += 1;
  };

  if (source[i] === "0" && i + 1 < len) {
    const marker = source[i + 1];
    const radixPred =
      marker === "x" || marker === "X"
        ? isHexDigit
        : marker === "o" || marker === "O"
          ? (c: string) => c >= "0" && c <= "7"
          : marker === "b" || marker === "B"
            ? (c: string) => c === "0" || c === "1"
            : null;
    if (radixPred) {
      i += 2;
      eat(radixPred);
      if (source[i] === "n") i += 1;
      return i;
    }
  }

  eat(isDigit);
  if (source[i] === ".") {
    i += 1;
    eat(isDigit);
  }
  if (source[i] === "e" || source[i] === "E") {
    const save = i;
    i += 1;
    if (source[i] === "+" || source[i] === "-") i += 1;
    if (isDigit(source[i])) eat(isDigit);
    else i = save;
  }
  if (source[i] === "n") i += 1;
  return i;
}

interface ScanFrame {
  kind: "code" | "template";
  untilClose?: boolean;
  depth?: number;
  def?: StringDef;
  start?: number;
  /** For an interpolation frame: the template to resume once it closes. */
  resumeTemplate?: StringDef;
}

export class Lexer {
  strings: StringDef[];
  comments: CommentDef[];
  identifierStart: RegExp;
  identifierPart: RegExp;
  operators: string[];
  punctuation: string[];
  regexEnabled: boolean;
  regexAfterParenKeywords: Set<string>;
  shebang: boolean;
  scanNumber: ScanNumberFn;
  regexKeywords: Set<string>;

  private stringOpeners: Map<string, StringDef[]>;
  private operatorByChar: Map<string, string[]>;
  private punctuationByChar: Map<string, string[]>;
  private identifierRe: RegExp;

  private source = "";
  private length = 0;
  private tokens: RawToken[] = [];
  private prev: RawToken | null = null;
  private pos = 0;
  private parenControls: boolean[] = [];
  private lastClosedControlParen = false;

  constructor(language: Partial<LanguageDefinition> = {}) {
    const lex = language.lex ?? {};
    this.strings = lex.strings ?? [];
    this.comments = (lex.comments ?? [])
      .slice()
      .sort((a, b) => b.open.length - a.open.length);
    this.identifierStart = lex.identifierStart ?? DEFAULT_IDENTIFIER_START;
    this.identifierPart = lex.identifierPart ?? DEFAULT_IDENTIFIER_PART;
    this.operators = sortByLengthDesc(lex.operators ?? language.operators ?? []);
    this.punctuation = sortByLengthDesc(
      lex.punctuation ?? language.punctuation ?? [],
    );
    this.regexEnabled = lex.regex !== false;
    this.regexAfterParenKeywords = new Set(lex.regexAfterParenKeywords ?? []);
    this.shebang = lex.shebang === true;
    this.scanNumber = lex.scanNumber ?? defaultScanNumber;
    this.regexKeywords = new Set(language.regexKeywords ?? []);

    this.stringOpeners = new Map();
    for (const def of this.strings) {
      if (!def.open) continue;
      const defs = this.stringOpeners.get(def.open[0]);
      if (defs) defs.push(def);
      else this.stringOpeners.set(def.open[0], [def]);
    }
    for (const defs of this.stringOpeners.values()) {
      defs.sort((a, b) => b.open.length - a.open.length);
    }

    this.operatorByChar = indexByFirstChar(this.operators);
    this.punctuationByChar = indexByFirstChar(this.punctuation);
    this.identifierRe = buildIdentifierRe(this.identifierStart, this.identifierPart);
  }

  tokenize(source: string): RawToken[] {
    // Snapshot the mutable scan state so tokenize() is re-entrant: a custom
    // scanNumber callback (or any future re-entrant path) can call tokenize()
    // again without corrupting the outer scan.
    const saved = {
      source: this.source,
      length: this.length,
      tokens: this.tokens,
      prev: this.prev,
      pos: this.pos,
      parenControls: this.parenControls,
      lastClosedControlParen: this.lastClosedControlParen,
    };
    this.source = source;
    this.length = source.length;
    this.tokens = [];
    this.prev = null;
    this.pos = 0;
    this.parenControls = [];
    this.lastClosedControlParen = false;

    try {
      if (this.shebang && source.startsWith("#!")) {
        let end = source.indexOf("\n");
        if (end === -1) end = this.length;
        this.emit("comment", 0, end, { kind: "line" });
        this.pos = end;
      }

      this.scanCode();
      return this.tokens;
    } finally {
      this.source = saved.source;
      this.length = saved.length;
      this.tokens = saved.tokens;
      this.prev = saved.prev;
      this.pos = saved.pos;
      this.parenControls = saved.parenControls;
      this.lastClosedControlParen = saved.lastClosedControlParen;
    }
  }

  emit(type: RawTokenType, start: number, end: number, detail?: RawTokenDetail): void {
    const token: RawToken = {
      type,
      start,
      end,
      value: this.source.slice(start, end),
      detail,
    };
    // `prev` tracks the last significant code token — whitespace and comments
    // are skipped so regex-vs-division disambiguation is comment-robust.
    if (type !== "whitespace" && type !== "comment") {
      this.prev = token;
      this.lastClosedControlParen =
        type === "punctuation" &&
        token.value === ")" &&
        detail?.controlClose === true;
    }
    this.tokens.push(token);
  }

  matchList(byChar: Map<string, string[]>): string | null {
    const ch = this.source[this.pos];
    if (ch === undefined) return null;
    const candidates = byChar.get(ch);
    if (!candidates) return null;
    for (const item of candidates) {
      if (this.source.startsWith(item, this.pos)) return item;
    }
    return null;
  }

  matchCommentOpen(): CommentDef | null {
    for (const def of this.comments) {
      if (this.source.startsWith(def.open, this.pos)) return def;
    }
    return null;
  }

  regexAllowed(): boolean {
    const p = this.prev;
    if (!p) return true;
    switch (p.type) {
      case "number":
      case "string":
      case "regex":
        return false;
      case "identifier":
        return this.regexKeywords.has(p.value);
      case "operator":
        return true;
      case "punctuation":
        if (p.value === ")") return this.lastClosedControlParen;
        return p.value !== "]" && p.value !== "}";
      default:
        return true;
    }
  }

  tryScanRegex(): boolean {
    const s = this.source;
    const start = this.pos;
    let i = this.pos + 1;
    let inClass = false;
    while (i < this.length) {
      const c = s[i];
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "\n") return false;
      if (inClass) {
        if (c === "]") inClass = false;
      } else if (c === "[") {
        inClass = true;
      } else if (c === "/") {
        i += 1;
        while (i < this.length && isAlpha(s[i])) i += 1;
        this.pos = i;
        this.emit("regex", start, i);
        return true;
      }
      i += 1;
    }
    return false;
  }

  scanString(def: StringDef): void {
    const s = this.source;
    const start = this.pos;
    this.pos += def.open.length;
    const escape = def.escape ?? "\\";
    while (this.pos < this.length) {
      const c = s[this.pos];
      if (escape && s.startsWith(escape, this.pos)) {
        this.pos += escape.length;
        if (this.pos < this.length) this.pos += 1;
        continue;
      }
      if (!def.multiline && c === "\n") break;
      if (s.startsWith(def.close, this.pos)) {
        this.pos += def.close.length;
        this.emit("string", start, this.pos, { quote: def.open });
        return;
      }
      this.pos += 1;
    }
    this.emit("string", start, this.pos, { quote: def.open, unterminated: true });
  }

  scanLineComment(def: CommentDef): void {
    const start = this.pos;
    const end = this.source.indexOf(def.close, this.pos + def.open.length);
    const stop = end === -1 ? this.length : end;
    this.pos = stop;
    this.emit("comment", start, stop, { kind: "line" });
  }

  scanBlockComment(def: CommentDef): void {
    const start = this.pos;
    const end = this.source.indexOf(def.close, this.pos + def.open.length);
    if (end === -1) {
      this.pos = this.length;
      this.emit("comment", start, this.length, { kind: "block", unterminated: true });
      return;
    }
    this.pos = end + def.close.length;
    this.emit("comment", start, this.pos, { kind: "block" });
  }

  /**
   * Scan code and template literals with an explicit stack instead of the
   * previous scanTemplate() <-> scanCode(true) mutual recursion, so pathological
   * `${` nesting cannot overflow the call stack.
   */
  scanCode(untilTemplateClose = false): void {
    const frames: ScanFrame[] = [
      { kind: "code", untilClose: untilTemplateClose, depth: 0 },
    ];
    const s = this.source;

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (!frame) break;

      if (frame.kind === "template") {
        const def = frame.def!;
        const start = frame.start!;
        if (this.pos >= this.length) {
          this.emit("string", start, this.pos, { quote: def.open, unterminated: true });
          frames.pop();
          continue;
        }
        const ch = s[this.pos];
        const escape = def.escape ?? "\\";
        if (escape && s.startsWith(escape, this.pos)) {
          this.pos += escape.length;
          if (this.pos < this.length) this.pos += 1;
          continue;
        }
        if (s.startsWith(def.close, this.pos)) {
          this.pos += def.close.length;
          this.emit("string", start, this.pos, { quote: def.open });
          frames.pop();
          continue;
        }
        if (ch === "$" && s[this.pos + 1] === "{") {
          this.emit("string", start, this.pos, { quote: def.open });
          const open = this.pos;
          this.pos += 2;
          this.emit("punctuation", open, this.pos, { templateOpen: true });
          // This chunk is finished; the interpolation frame owns resuming the
          // template after its closing `}`. Popping first is what keeps a
          // stale chunk frame from re-scanning the rest of the source.
          frames.pop();
          frames.push({ kind: "code", untilClose: true, depth: 0, resumeTemplate: def });
          continue;
        }
        this.pos += 1;
        continue;
      }

      // ---- code frame ----
      if (this.pos >= this.length) {
        frames.pop();
        if (frame.resumeTemplate) {
          frames.push({ kind: "template", def: frame.resumeTemplate, start: this.pos });
        }
        continue;
      }
      const start = this.pos;
      const ch = s[this.pos];

      if (isWhitespaceChar(ch)) {
        let i = this.pos + 1;
        while (i < this.length && isWhitespaceChar(s[i])) i += 1;
        this.emit("whitespace", start, i);
        this.pos = i;
        continue;
      }

      this.identifierRe.lastIndex = this.pos;
      const id = this.identifierRe.exec(s);
      if (id) {
        const end = this.pos + id[0].length;
        this.emit("identifier", start, end);
        this.pos = end;
        continue;
      }

      if (isDigit(ch) || (ch === "." && isDigit(s[this.pos + 1]))) {
        const end = this.scanNumber(s, this.pos);
        if (end > this.pos) {
          this.emit("number", start, end);
          this.pos = end;
          continue;
        }
      }

      const strDefs = this.stringOpeners.get(ch);
      const strDef = strDefs?.find((def) => s.startsWith(def.open, this.pos));
      if (strDef) {
        if (strDef.template) {
          frames.push({ kind: "template", def: strDef, start: this.pos });
          this.pos += strDef.open.length;
        } else {
          this.scanString(strDef);
        }
        continue;
      }

      const commentDef = this.matchCommentOpen();
      if (commentDef) {
        if (commentDef.line) this.scanLineComment(commentDef);
        else this.scanBlockComment(commentDef);
        continue;
      }

      if (this.regexEnabled && ch === "/" && this.regexAllowed() && this.tryScanRegex()) {
        continue;
      }

      const decoratorWidth = codePointWidthAt(s, this.pos + 1);
      if (
        ch === "@" &&
        matches(
          this.identifierStart,
          s.slice(this.pos + 1, this.pos + 1 + decoratorWidth),
        )
      ) {
        let i = this.pos + 1 + decoratorWidth;
        while (i < this.length) {
          const partWidth = codePointWidthAt(s, i);
          if (!matches(this.identifierPart, s.slice(i, i + partWidth))) break;
          i += partWidth;
        }
        this.emit("decorator", start, i);
        this.pos = i;
        continue;
      }

      if (ch === "{") {
        if (frame.untilClose) frame.depth = (frame.depth ?? 0) + 1;
        this.pos += 1;
        this.emit("punctuation", start, this.pos);
        continue;
      }

      if (ch === "}") {
        if (frame.untilClose && frame.depth === 0) {
          this.pos += 1;
          this.emit("punctuation", start, this.pos, { templateClose: true });
          frames.pop();
          if (frame.resumeTemplate) {
            frames.push({ kind: "template", def: frame.resumeTemplate, start: this.pos });
          }
          continue;
        }
        if (frame.untilClose) frame.depth = (frame.depth ?? 0) - 1;
        this.pos += 1;
        this.emit("punctuation", start, this.pos);
        continue;
      }

      if (ch === "(") {
        this.parenControls.push(
          this.prev?.type === "identifier" &&
            this.regexAfterParenKeywords.has(this.prev.value),
        );
      }

      if (ch === ")") {
        const controlClose = this.parenControls.pop() ?? false;
        this.pos += 1;
        this.emit("punctuation", start, this.pos, { controlClose });
        continue;
      }

      const op = this.matchList(this.operatorByChar);
      if (op) {
        this.pos += op.length;
        this.emit("operator", start, this.pos);
        continue;
      }

      const punc = this.matchList(this.punctuationByChar);
      if (punc) {
        this.pos += punc.length;
        this.emit("punctuation", start, this.pos);
        continue;
      }

      this.pos += 1;
      this.emit("punctuation", start, this.pos, { unknown: true });
    }
  }
}
