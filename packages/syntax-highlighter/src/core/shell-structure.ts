/**
 * Shell structure pass (opt-in via `features.shellStructure`).
 *
 * Shell meaning is positional: the first word of a command is the command,
 * later words are arguments. After the generic classifier runs, this pass
 *
 *   1. splits double-quoted strings around `$VAR`, `${…}`, `$1`, `$@` …,
 *      so interpolated variables read as variables rather than string text;
 *   2. marks expansions outside strings (`$HOME`, `${x:-y}`) as variables;
 *   3. walks commands word by word: command names → function (reserved
 *      words and `export`/`local`/`declare` stay keywords), arguments →
 *      string, options (`-x`, `--long`) → constant, assignment names
 *      (`A=1 cmd`, `export A=1`) → variable, heredoc bodies → string.
 *
 * Tokens may be split (phase 1) but always stay sorted and contiguous.
 */

import { createToken, type Token, TokenType, WHITESPACE } from "./tokens.ts";

/** Reserved words after which a new command starts. */
const COMMAND_PREFIX_WORDS = new Set([
  "if",
  "then",
  "else",
  "elif",
  "do",
  "while",
  "until",
  "!",
  "time",
  "coproc",
]);
/** Reserved words that end a compound command. */
const CLOSING_WORDS = new Set(["fi", "done", "esac"]);
/** Words that stay keywords in command position. */
const KEYWORD_COMMANDS = new Set([
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "for",
  "while",
  "until",
  "do",
  "done",
  "case",
  "esac",
  "in",
  "function",
  "select",
  "time",
  "coproc",
  "return",
  "break",
  "continue",
]);
/** Declaration builtins: keywords whose arguments may be assignments. */
const DECLARATION_COMMANDS = new Set(["export", "local", "declare", "readonly", "typeset"]);
const SPECIAL_PARAMETER = /^\$(?:[@*#?$!\-0-9]|[A-Za-z_][A-Za-z0-9_]*)/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/;
const REDIRECT = /^(?:\d*(?:>>?|<<<|<>|<)&?(?:\d+-?|-)?|&>>?)$/;

export function applyShellStructure(input: Token[], source: string): Token[] {
  /**
   * Starts of tokens whose type is final: `$` expansions and the pieces of a
   * `$(…)` substitution inside a string. Word-level retyping skips them.
   */
  const expansions = new Set<number>();
  const tokens = splitStringInterpolation(input, source, expansions);
  markExpansions(tokens, source, expansions);

  const text = (t: Token) => source.slice(t.start, t.end);
  const set = (i: number, type: Token["type"]) => {
    const t = tokens[i];
    tokens[i] = createToken(type, t.start, t.end, t.semantic);
  };
  const isExpansion = (t: Token) => expansions.has(t.start);

  /** Command separators; `&` inside a redirect (`>&2`) is not one. */
  const isSeparator = (i: number) => {
    const t = tokens[i];
    if (t.type === WHITESPACE || t.type === TokenType.COMMENT) return true;
    const v = text(t);
    if (t.type === TokenType.OPERATOR) {
      if (v === "&") {
        const prev = tokens[i - 1];
        const next = tokens[i + 1];
        if (prev && prev.end === t.start && /[<>]$/.test(text(prev))) return false;
        if (next && next.start === t.end && text(next).startsWith(">")) return false;
      }
      return v === ";" || v === "|" || v === "||" || v === "&&" || v === "&";
    }
    if (t.type === TokenType.PUNCTUATION) return v === "(" || v === ")";
    return false;
  };

  let atCommand = true;
  let declaring = false; // inside `export …` / `local …`
  let expectName = false; // after `function`, `for`, `select`, `case`
  let caseDepth = 0;
  let afterRedirect = false;
  let inTest = false; // between `[`/`[[` and `]`/`]]`
  let heredoc: { delimiter: string; strip: boolean } | null = null;

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const v = text(t);

    if (isSeparator(i)) {
      if (t.type === WHITESPACE && v.includes("\n")) {
        if (heredoc) {
          i = consumeHeredoc(i, heredoc);
          heredoc = null;
          atCommand = true;
          declaring = false;
          continue;
        }
        const prev = tokens[i - 1];
        if (!(prev && text(prev).endsWith("\\"))) {
          atCommand = true;
          declaring = false;
        }
      } else if (t.type !== WHITESPACE && t.type !== TokenType.COMMENT) {
        // Inside `[[ … ]]`, `&&` and `||` join tests; no new command starts.
        if (inTest && (v === "&&" || v === "||")) {
          i++;
          continue;
        }
        atCommand = v !== ")" || caseDepth > 0;
        declaring = false;
      }
      i++;
      continue;
    }

    // Case pattern at command position: `start|run)`.
    if (caseDepth > 0 && atCommand) {
      const pattern = /^[^\s()|;]+(?:\s*\|\s*[^\s()|;]+)*\s*\)/.exec(
        source.slice(t.start, t.start + 512),
      );
      if (pattern && !/^esac\b/.test(pattern[0])) {
        const end = t.start + pattern[0].length - 1; // up to, not including, `)`
        let j = i;
        for (; j < tokens.length && tokens[j].start < end; j++) {
          const tk = tokens[j];
          if (tk.type !== WHITESPACE && text(tk) !== "|" && !isExpansion(tk))
            set(j, TokenType.STRING);
        }
        i = j;
        continue;
      }
    }

    // One word: adjacent non-separator tokens.
    const first = i;
    let last = i;
    while (
      last + 1 < tokens.length &&
      !isSeparator(last + 1) &&
      tokens[last + 1].start === tokens[last].end
    ) {
      last++;
    }
    const word = source.slice(tokens[first].start, tokens[last].end);
    i = last + 1;

    if (word === "{" || word === "}") {
      set(first, TokenType.PUNCTUATION);
      atCommand = word === "{";
      continue;
    }

    // Heredoc operator: `<<EOF`, `<<-'EOF'`, `<< "EOF"`.
    if (word.startsWith("<<") && !word.startsWith("<<<")) {
      const strip = word.startsWith("<<-");
      let delimiter = word.slice(strip ? 3 : 2);
      let last2 = last;
      if (!delimiter) {
        let k = last + 1;
        while (
          k < tokens.length &&
          tokens[k].type === WHITESPACE &&
          !text(tokens[k]).includes("\n")
        )
          k++;
        if (k < tokens.length && !isSeparator(k)) {
          last2 = k;
          while (
            last2 + 1 < tokens.length &&
            !isSeparator(last2 + 1) &&
            tokens[last2 + 1].start === tokens[last2].end
          )
            last2++;
          delimiter = source.slice(tokens[k].start, tokens[last2].end);
          i = last2 + 1;
        }
      }
      delimiter = delimiter.replace(/^['"]|['"]$/g, "");
      if (delimiter) heredoc = { delimiter, strip };
      for (let j = first; j <= last2; j++)
        if (tokens[j].type !== WHITESPACE) set(j, TokenType.OPERATOR);
      continue;
    }

    // Redirections: `>`, `>>`, `2>`, `>&2`, `2>&1`, `&>` — the target is a filename.
    if (REDIRECT.test(word)) {
      for (let j = first; j <= last; j++) set(j, TokenType.OPERATOR);
      afterRedirect = !/[&]\d*-?$/.test(word) || word.startsWith("&>");
      continue;
    }

    if (afterRedirect) {
      afterRedirect = false;
      retypeWord(first, last, TokenType.STRING);
      continue;
    }

    if (expectName) {
      // `function NAME`, `for NAME`, `case WORD`: the name keeps its classifier type.
      expectName = false;
      continue;
    }

    if (atCommand || declaring) {
      const assign = ASSIGNMENT.exec(word);
      if (assign) {
        assignment(first, last, tokens[first].start + assign[0].length);
        continue; // prefix assignments keep command position
      }
    }

    if (atCommand) {
      if (DECLARATION_COMMANDS.has(word)) {
        retypeWord(first, last, TokenType.KEYWORD);
        atCommand = false;
        declaring = true;
        continue;
      }
      if (KEYWORD_COMMANDS.has(word)) {
        // Keep `control` (if/for/while/…) where the classifier assigned it.
        if (tokens[first].type !== TokenType.CONTROL) retypeWord(first, last, TokenType.KEYWORD);
        if (word === "case") caseDepth++;
        if (word === "esac") caseDepth = Math.max(0, caseDepth - 1);
        expectName = word === "function" || word === "for" || word === "select" || word === "case";
        atCommand = COMMAND_PREFIX_WORDS.has(word);
        continue;
      }
      if (word === "true" || word === "false") {
        atCommand = false; // the `true`/`false` builtins stay booleans
        continue;
      }
      if (CLOSING_WORDS.has(word)) {
        atCommand = false;
        continue;
      }
      if (word === "[[" || word === "[") {
        atCommand = false;
        inTest = true;
        continue;
      }
      retypeWord(first, last, TokenType.FUNCTION);
      atCommand = false;
      continue;
    }

    // Arguments.
    if (word === "in" && tokens[first].type === TokenType.KEYWORD) continue; // for x in …
    if (word === "]]" || word === "]") {
      inTest = false;
      continue;
    }
    if (inTest && /^-[A-Za-z]{1,2}$/.test(word)) {
      // Test operators (`-z`, `-eq`, `-f`) read as operators, not options.
      for (let j = first; j <= last; j++) set(j, TokenType.OPERATOR);
      continue;
    }
    if (/^\d+$/.test(word)) {
      for (let j = first; j <= last; j++) set(j, TokenType.NUMBER);
      continue;
    }
    if (/^--?[A-Za-z0-9]/.test(word)) {
      const eq = word.indexOf("=");
      const optionEnd = eq === -1 ? tokens[last].end : tokens[first].start + eq;
      for (let j = first; j <= last; j++) {
        const tk = tokens[j];
        if (isExpansion(tk) || isQuoted(tk)) continue;
        set(j, tk.end <= optionEnd ? TokenType.CONSTANT : TokenType.STRING);
      }
      continue;
    }
    if (declaring) {
      retypeWord(first, last, TokenType.VARIABLE); // `export NAME`
      continue;
    }
    retypeWord(first, last, TokenType.STRING);
  }

  return tokens;

  function isQuoted(tk: Token): boolean {
    return tk.type === TokenType.STRING && /^(?:["'`]|\$["'])/.test(text(tk));
  }

  /** Retype a word's tokens, keeping expansions and (for non-strings) quoted parts. */
  function retypeWord(first: number, last: number, type: Token["type"]) {
    for (let j = first; j <= last; j++) {
      const tk = tokens[j];
      if (isExpansion(tk)) continue;
      if (isQuoted(tk) || (tk.type === TokenType.STRING && type === TokenType.STRING)) continue;
      set(j, type);
    }
  }

  /** `NAME=value`: name variable, `=` operator, unquoted value string. */
  function assignment(first: number, last: number, valueStart: number) {
    for (let j = first; j <= last; j++) {
      const tk = tokens[j];
      if (isExpansion(tk) || isQuoted(tk)) continue;
      if (tk.end <= valueStart) {
        const eq = tk.end === valueStart && text(tk).endsWith("=");
        set(j, eq ? TokenType.OPERATOR : TokenType.VARIABLE);
      } else {
        set(j, TokenType.STRING);
      }
    }
  }

  /** Body lines up to the delimiter become strings; returns the next index. */
  function consumeHeredoc(
    newlineIndex: number,
    doc: { delimiter: string; strip: boolean },
  ): number {
    const nl = tokens[newlineIndex];
    let lineStart = nl.start + text(nl).indexOf("\n") + 1;
    let bodyEnd = source.length;
    let resume = source.length;
    while (lineStart <= source.length) {
      let lineEnd = source.indexOf("\n", lineStart);
      if (lineEnd === -1) lineEnd = source.length;
      const line = source.slice(lineStart, lineEnd).replace(/\r$/, "");
      if ((doc.strip ? line.replace(/^\t+/, "") : line) === doc.delimiter) {
        bodyEnd = lineStart;
        resume = lineEnd;
        break;
      }
      lineStart = lineEnd + 1;
    }
    let j = newlineIndex + 1;
    for (; j < tokens.length && tokens[j].start < bodyEnd; j++) {
      if (tokens[j].type !== WHITESPACE && !isExpansion(tokens[j])) set(j, TokenType.STRING);
    }
    for (; j < tokens.length && tokens[j].start < resume; j++) {
      if (tokens[j].type !== WHITESPACE) set(j, TokenType.KEYWORD);
    }
    return j;
  }
}

/** Phase 1: split `"…$x…"` strings so interpolations become variable tokens. */
function splitStringInterpolation(
  tokens: Token[],
  source: string,
  expansions: Set<number>,
): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const v = source.slice(t.start, t.end);
    if (
      t.type !== TokenType.STRING ||
      !(v.startsWith('"') || v.startsWith('$"')) ||
      !v.includes("$", 1)
    ) {
      out.push(t);
      continue;
    }
    let segment = t.start;
    let i = t.start + (v.startsWith("$") ? 2 : 1);
    const end = t.end;
    while (i < end) {
      const c = source[i];
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c !== "$") {
        i++;
        continue;
      }
      // `$(cmd args)` inside a string: the command is highlighted as one.
      // (`$((…))` arithmetic stays string text.)
      if (source[i + 1] === "(" && source[i + 2] !== "(") {
        const close = matchingParen(source, i + 1, end);
        if (close !== -1) {
          if (i > segment) out.push(createToken(TokenType.STRING, segment, i, t.semantic));
          // Like `${ }`, the delimiters keep the string color.
          out.push(createToken(TokenType.STRING, i, i + 2, t.semantic));
          expansions.add(i);
          pushSubstitution(out, source, i + 2, close, expansions);
          out.push(createToken(TokenType.STRING, close, close + 1, t.semantic));
          expansions.add(close);
          segment = close + 1;
          i = close + 1;
          continue;
        }
      }
      let varEnd = -1;
      if (source[i + 1] === "{") {
        let depth = 0;
        for (let k = i + 1; k < end; k++) {
          if (source[k] === "{") depth++;
          else if (source[k] === "}" && --depth === 0) {
            varEnd = k + 1;
            break;
          }
        }
      } else {
        const m = SPECIAL_PARAMETER.exec(source.slice(i, end));
        if (m) varEnd = i + m[0].length;
      }
      // Never let a variable swallow the closing quote.
      if (varEnd !== -1 && varEnd >= end && source[end - 1] === '"') varEnd = end - 1;
      if (varEnd === -1 || varEnd <= i + 1) {
        i++;
        continue;
      }
      if (i > segment) out.push(createToken(TokenType.STRING, segment, i, t.semantic));
      if (source[i + 1] === "{") {
        // In a string, `${` and `}` keep the string color; only the name is a variable.
        out.push(createToken(TokenType.STRING, i, i + 2, t.semantic));
        if (varEnd - 1 > i + 2) {
          out.push(createToken(TokenType.VARIABLE, i + 2, varEnd - 1));
          expansions.add(i + 2);
        }
        out.push(createToken(TokenType.STRING, varEnd - 1, varEnd, t.semantic));
      } else {
        out.push(createToken(TokenType.VARIABLE, i, varEnd));
        expansions.add(i);
      }
      segment = varEnd;
      i = varEnd;
    }
    if (segment < end) out.push(createToken(TokenType.STRING, segment, end, t.semantic));
  }
  return out;
}

/** Phase 2: `$NAME`, `$1`, `${…}` outside strings → variable. */
function markExpansions(tokens: Token[], source: string, expansions: Set<number>): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === TokenType.STRING || t.type === TokenType.COMMENT) continue;
    const value = source.slice(t.start, t.end);
    // A token that is itself a whole expansion (`$n`, `$1`).
    if (value.length > 1 && value.startsWith("$")) {
      const whole = SPECIAL_PARAMETER.exec(value);
      if (whole && whole[0].length === value.length) {
        tokens[i] = createToken(TokenType.VARIABLE, t.start, t.end);
        expansions.add(t.start);
      }
      continue;
    }
    if (value !== "$") continue;
    const nextChar = source[t.end];
    if (nextChar === "(") continue; // command substitution: its contents are commands
    let end = -1;
    if (nextChar === "{") {
      let depth = 0;
      for (let k = t.end; k < source.length; k++) {
        if (source[k] === "{") depth++;
        else if (source[k] === "}" && --depth === 0) {
          end = k + 1;
          break;
        }
        if (source[k] === "\n") break;
      }
    } else {
      const m = SPECIAL_PARAMETER.exec(source.slice(t.start, t.start + 256));
      if (m) end = t.start + m[0].length;
    }
    if (end === -1) continue;
    for (let j = i; j < tokens.length && tokens[j].start < end; j++) {
      if (tokens[j].end > end) break; // never retype a token that extends past the expansion
      tokens[j] = createToken(TokenType.VARIABLE, tokens[j].start, tokens[j].end);
      expansions.add(tokens[j].start);
      i = j;
    }
  }
}

/** Index of the `)` matching the `(` at `open`, before `end`; -1 if none. */
function matchingParen(source: string, open: number, end: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let k = open; k < end; k++) {
    const c = source[k];
    if (c === "\\") {
      k++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === "'" || (c === '"' && k > open)) {
      quote = c;
    } else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return k;
  }
  return -1;
}

/**
 * Tokens for the command inside `$(…)` in a string: first word function,
 * `$` expansions variable, other words string.
 */
function pushSubstitution(
  out: Token[],
  source: string,
  start: number,
  end: number,
  expansions: Set<number>,
): void {
  let i = start;
  let first = true;
  while (i < end) {
    let j = i;
    if (/\s/.test(source[i])) {
      while (j < end && /\s/.test(source[j])) j++;
      out.push(createToken(WHITESPACE, i, j));
    } else {
      while (j < end && !/\s/.test(source[j])) j++;
      const word = source.slice(i, j);
      if (word.startsWith("$") && SPECIAL_PARAMETER.test(word)) {
        out.push(createToken(TokenType.VARIABLE, i, j));
        expansions.add(i);
      } else {
        out.push(createToken(first ? TokenType.FUNCTION : TokenType.STRING, i, j));
        expansions.add(i);
      }
      first = false;
    }
    i = j;
  }
}
