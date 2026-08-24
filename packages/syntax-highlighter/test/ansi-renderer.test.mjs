import { assert, assertEquals, assertThrows, test } from "runtime:test";
import { dracula } from "../src/ansi/themes/dracula.ts";
import { monokai } from "../src/ansi/themes/monokai.ts";
import { nord } from "../src/ansi/themes/nord.ts";
import {
  ANSI_RESET,
  AnsiRenderer,
  defaultTheme,
  hexToAnsi,
  renderANSI,
} from "../src/core/ansi-renderer.ts";
import { Highlighter } from "../src/core/highlighter.ts";
import javascript from "../src/languages/javascript.ts";
import { stripAnsi } from "./helpers/wcag.mjs";

const highlighter = new Highlighter(javascript);

function render(src, opts) {
  return new AnsiRenderer(opts).render(src, highlighter.highlight(src));
}

test("AnsiRenderer.render wraps semantic tokens with truecolor by default", () => {
  const src = "const x = 42;";
  const ansi = render(src);
  const kwAnsi = hexToAnsi(defaultTheme.keyword);
  const varAnsi = hexToAnsi(defaultTheme.variable);
  const numAnsi = hexToAnsi(defaultTheme.number);
  assert(ansi.includes(`${kwAnsi}const${ANSI_RESET}`));
  assert(ansi.includes(`${varAnsi}x${ANSI_RESET}`));
  assert(ansi.includes(`${numAnsi}42${ANSI_RESET}`));
  assertEquals(stripAnsi(ansi), src);
  assert(ansi.includes(ANSI_RESET));
});

test("AnsiRenderer recovers text via source.slice", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const ansi = new AnsiRenderer().render(src, toks);
  assertEquals(stripAnsi(ansi), src);
});

test("AnsiRenderer handles surrogate pairs", () => {
  const src = "const \uD835\uDC9C = 1;";
  const ansi = render(src);
  assert(ansi.includes("\uD835\uDC9C"));
  const toks = highlighter.highlight(src);
  const ansi2 = new AnsiRenderer().render(src, toks);
  assertEquals(stripAnsi(ansi2), src);
});

test("AnsiRenderer fills gaps for non-contiguous tokens", () => {
  const src = "const x = 42;";
  const partial = [{ start: 0, end: 5, type: "keyword" }];
  const ansi = new AnsiRenderer().render(src, partial);
  const kwAnsi = hexToAnsi(defaultTheme.keyword);
  assert(ansi.includes(`${kwAnsi}const${ANSI_RESET}`));
  assertEquals(stripAnsi(ansi), src);
  assert(stripAnsi(ansi).includes("x = 42;"));
});

test("AnsiRenderer theme override (RGB) converts hex to truecolor", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const ansi = renderANSI(src, toks, { theme: dracula });
  const kwAnsi = hexToAnsi(dracula.keyword);
  assert(ansi.includes(`${kwAnsi}const${ANSI_RESET}`));
  // should not use default theme's keyword color
  const defaultKw = hexToAnsi(defaultTheme.keyword);
  assert(!ansi.includes(`${defaultKw}const`));

  // monokai theme
  const ansi2 = renderANSI(src, toks, { theme: monokai });
  assert(ansi2.includes(`${hexToAnsi(monokai.keyword)}const${ANSI_RESET}`));

  // nord theme
  const ansi3 = renderANSI(src, toks, { theme: nord });
  assert(ansi3.includes(`${hexToAnsi(nord.keyword)}const${ANSI_RESET}`));
});

test("AnsiRenderer custom colors (legacy) and wrapWhitespace", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const ansi = renderANSI(src, toks, { colors: { keyword: "\x1b[31m" } });
  assert(ansi.includes("\x1b[31mconst\x1b[0m"));
  const defaultKw = hexToAnsi(defaultTheme.keyword);
  assert(!ansi.includes(`${defaultKw}const`));

  const src2 = "a b";
  const toks2 = [
    { start: 0, end: 1, type: "variable" },
    { start: 1, end: 2, type: "whitespace" },
    { start: 2, end: 3, type: "variable" },
  ];
  const plain = new AnsiRenderer().render(src2, toks2);
  assertEquals(stripAnsi(plain), src2);
  assert(!plain.includes(`${ANSI_RESET} ${ANSI_RESET}`));
  const sgrCount = (plain.match(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g")) ?? [])
    .length;
  assertEquals(sgrCount, 4);

  const colored = renderANSI(src2, toks2, {
    wrapWhitespace: true,
    colors: { whitespace: "\x1b[90m" },
  });
  assert(colored.includes("\x1b[90m \x1b[0m"));
  assertEquals(stripAnsi(colored), src2);

  // wrapWhitespace via theme hex
  const colored2 = renderANSI(src2, toks2, {
    wrapWhitespace: true,
    theme: { whitespace: "#6272a4" },
  });
  assert(colored2.includes(`${hexToAnsi("#6272a4")} ${ANSI_RESET}`));
});

test("AnsiRenderer color:false disables color (plain output)", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const ansi = renderANSI(src, toks, { theme: dracula, color: false });
  assertEquals(ansi, src);
  assert(!ansi.includes(String.fromCharCode(27)));
  // even with dracula theme, no ANSI
  const ansi2 = new AnsiRenderer({ theme: dracula, color: false }).render(src, toks);
  assertEquals(ansi2, src);

  // respects NO_COLOR env var
  const g = globalThis;
  const hadProcess = !!g.process;
  const prev = g.process?.env?.NO_COLOR;
  try {
    if (!g.process) g.process = { env: {} };
    if (!g.process.env) g.process.env = {};
    g.process.env.NO_COLOR = "1";
    // also set bare process if exposed separately
    try {
      if (typeof process !== "undefined" && process?.env) process.env.NO_COLOR = "1";
    } catch {}
    const ansi3 = renderANSI(src, toks, { theme: dracula });
    assertEquals(ansi3, src);
    // explicit color:true overrides NO_COLOR
    const ansi4 = renderANSI(src, toks, { theme: dracula, color: true });
    assert(ansi4.includes(String.fromCharCode(27)));
  } finally {
    if (hadProcess) {
      if (prev === undefined) delete g.process.env.NO_COLOR;
      else g.process.env.NO_COLOR = prev;
    } else {
      delete g.process;
    }
    try {
      if (typeof process !== "undefined" && process?.env) {
        if (prev === undefined) delete process.env.NO_COLOR;
        else process.env.NO_COLOR = prev;
      }
    } catch {}
  }
});

test("hexToAnsi converts hex to truecolor SGR", () => {
  assertEquals(hexToAnsi("#ff79c6"), "\x1b[38;2;255;121;198m");
  assertEquals(hexToAnsi("#f1fa8c"), "\x1b[38;2;241;250;140m");
  assertEquals(hexToAnsi("#fff"), "\x1b[38;2;255;255;255m");
  assertEquals(hexToAnsi("invalid"), "");
  // dracula keyword #ff79c6 -> 255,121,198
  assertEquals(hexToAnsi(dracula.keyword), "\x1b[38;2;255;121;198m");
});

test("AnsiRenderer tolerates unsorted and overlapping tokens", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const reversed = [...toks].reverse();
  const ansi = new AnsiRenderer().render(src, reversed);
  assertEquals(stripAnsi(ansi), src);
  assert(ansi.includes(`${hexToAnsi(defaultTheme.keyword)}const${ANSI_RESET}`));

  const dup = [...toks];
  dup.splice(1, 0, dup[1]);
  const ansi2 = new AnsiRenderer().render(src, dup);
  assertEquals(stripAnsi(ansi2), src);
});

test("AnsiRenderer validates source and tokens types", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  assertThrows(() => renderANSI(123, toks));
  assertThrows(() => renderANSI(src, "bad"));
  assertThrows(() => new AnsiRenderer().render(123, toks));
});

test("AnsiRenderer class is canonical", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  const r = new AnsiRenderer();
  assertEquals(r.render(src, toks), renderANSI(src, toks));
  assertEquals(r.render(src, toks), new AnsiRenderer().render(src, toks));
  const custom = new AnsiRenderer({ colors: { keyword: "\x1b[31m" } });
  assertEquals(
    custom.render(src, toks),
    renderANSI(src, toks, { colors: { keyword: "\x1b[31m" } }),
  );
  const themed = new AnsiRenderer({ theme: dracula });
  assertEquals(themed.render(src, toks), renderANSI(src, toks, { theme: dracula }));
});

test("empty source renders empty string", () => {
  assertEquals(new AnsiRenderer().render("", []), "");
  assertEquals(renderANSI("", []), "");
});

test("tokens are renderer-agnostic: no DOM Range used", () => {
  const src = "const x = 42;";
  const toks = highlighter.highlight(src);
  for (const t of toks) {
    assertEquals(Object.keys(t).sort(), ["end", "start", "type"]);
    assert(!("text" in t));
    assert(!("value" in t));
  }
  const ansi = new AnsiRenderer().render(src, toks);
  assert(ansi.length >= src.length);
  assert(ansi.includes("\x1b["));
  assertEquals(stripAnsi(ansi), src);
});

test("AnsiRenderer does not emit ANSI for unknown types and emits plain gaps", () => {
  const src = "const x = 42;";
  const unknown = [{ start: 0, end: 5, type: "unknown" }];
  const ansi = new AnsiRenderer().render(src, unknown);
  assert(!ansi.includes(`${hexToAnsi(defaultTheme.keyword)}const`));
  assert(!ansi.includes("\x1b[35mconst"));
  assertEquals(stripAnsi(ansi), src);

  const outOfBounds = [{ start: -1, end: 5, type: "keyword" }];
  const ansi2 = new AnsiRenderer().render(src, outOfBounds);
  assertEquals(stripAnsi(ansi2), src);
});

test("AnsiTheme is plain RGB data: no escape codes inside theme", () => {
  for (const [k, v] of Object.entries(dracula)) {
    assert(v.startsWith("#"), `dracula.${k} should be hex, got ${v}`);
    assert(!v.includes("\x1b"), `theme should not contain escape codes`);
  }
  for (const v of Object.values(defaultTheme)) {
    assert(v.startsWith("#"));
  }
  // type alias maps to class
  const withType = { type: "#8be9fd" };
  const src = "class Foo {}";
  const toks = [{ start: 6, end: 9, type: "class" }];
  const ansi = renderANSI(src, toks, { theme: withType });
  assert(ansi.includes(`${hexToAnsi("#8be9fd")}Foo${ANSI_RESET}`));
});

test("Themes are tree-shakeable separate modules", () => {
  // each theme is its own module with only RGB data
  assert(dracula.keyword === "#ff79c6");
  assert(monokai.keyword === "#f92672");
  assert(nord.keyword === "#81a1c1");
  assert(defaultTheme.keyword === "#c678dd");
});
