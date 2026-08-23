/**
 * End-to-end: the published bundle, the shipped stylesheet, and a real
 * browser's CSS Custom Highlight API.
 *
 * The unit tests stub `CSS.highlights`, so they prove ranges are registered
 * but not that anything is painted, and not that the DOM survives untouched.
 * These drive the built `dist/` in headless Chrome and read pixels back off
 * a screenshot.
 */
import { test, assert, assertEquals, beforeAll, afterAll } from "runtime:test";
import { Command } from "runtime:system";
import { dirname, fromFileURL, join } from "runtime:path";
import {
  findBrowser,
  nearestColor,
  openBrowser,
  rangeRects,
  serveDirectory,
  themeColors,
} from "./e2e/browser.mjs";

const packageRoot = join(dirname(fromFileURL(import.meta.url)), "..");
const browserPath = await findBrowser();

// How far a sampled glyph colour may sit from the theme's declared colour.
// Antialiasing pulls edge pixels toward the background; a stroke's core does
// not move nearly this far, and an entirely wrong colour moves much further.
const COLOR_TOLERANCE = 24;

const SOURCE = [
  "const greet = (name) => `hi ${name}!`;",
  "// a comment",
  "let total = 42;",
].join("\n");

const offsetOf = (text, from = 0) => SOURCE.indexOf(text, from);

if (!browserPath) {
  test("browser end-to-end tests are skipped without a browser", () => {
    assert(true, "set CHROME_PATH, or install chromium, to run them");
  });
} else {
  let server;
  let page;
  let theme;

  beforeAll(async () => {
    // Test what actually ships: build the library the way `pnpm build` does.
    const build = await new Command("esdev", {
      args: ["build", "--lib", "src"],
      cwd: packageRoot,
      inheritEnv: true,
    }).output();
    if (!build.success) {
      throw new Error(`esdev build failed:\n${new TextDecoder().decode(build.stderr)}`);
    }
    theme = await themeColors(join(packageRoot, "src/themes/default.css"));
    server = await serveDirectory(packageRoot);
    page = await openBrowser(browserPath);
    await page.goto(`${server.origin}/test/e2e/fixture.html`);
    await page.waitFor("window.ready", { label: "the fixture module to load" });
  });

  afterAll(async () => {
    await page?.close();
    await server?.close();
  });

  async function highlight(source = SOURCE, element = "one") {
    return page.evaluate(`
      window.handles ??= {};
      window.handles[${JSON.stringify(element)}]?.dispose();
      window.handles[${JSON.stringify(element)}] = await window.sh.highlightElement(
        document.getElementById(${JSON.stringify(element)}),
        ${JSON.stringify(source)},
      );
      return true;
    `);
  }

  test("the browser under test implements the CSS Custom Highlight API", async () => {
    const support = await page.evaluate(`
      return {
        highlights: typeof CSS.highlights,
        highlight: typeof Highlight,
        staticRange: typeof StaticRange,
      };
    `);
    assertEquals(support, {
      highlights: "object",
      highlight: "function",
      staticRange: "function",
    });
  });

  test("highlighting registers sh-* highlights without touching the DOM", async () => {
    await highlight();
    const state = await page.evaluate(`
      const pre = document.getElementById("one");
      return {
        text: pre.textContent,
        childNodes: pre.childNodes.length,
        elements: pre.getElementsByTagName("*").length,
        html: pre.innerHTML,
        names: [...CSS.highlights.keys()].filter((n) => n.startsWith("sh-")).sort(),
      };
    `);

    assertEquals(state.text, SOURCE, "the source text is preserved verbatim");
    assertEquals(state.childNodes, 1, "the source stays in a single text node");
    assertEquals(state.elements, 0, "no wrapper elements are inserted");
    assert(!state.html.includes("<"), `no markup was injected: ${state.html}`);
    for (const name of ["sh-keyword", "sh-string", "sh-comment", "sh-number"]) {
      assert(state.names.includes(name), `${name} registered (got ${state.names})`);
    }
  });

  test("a keyword is actually painted in the theme's keyword colour", async () => {
    await highlight();
    const start = offsetOf("const");
    const colors = await page.colorsIn(rangeRects("one", start, start + 5));
    const { color, distance } = nearestColor(colors, theme.keyword);
    assert(
      distance <= COLOR_TOLERANCE,
      `expected ~${theme.keyword} on "const", nearest painted was ${color} (distance ${distance.toFixed(1)})`,
    );
  });

  test("each token type is painted its own colour", async () => {
    await highlight();
    const cases = [
      ["comment", "// a comment"],
      ["number", "42"],
      ["keyword", "let"],
    ];
    for (const [type, text] of cases) {
      const start = offsetOf(text);
      const colors = await page.colorsIn(rangeRects("one", start, start + text.length));
      const { color, distance } = nearestColor(colors, theme[type]);
      assert(
        distance <= COLOR_TOLERANCE,
        `expected ~${theme[type]} on ${type} "${text}", nearest was ${color} (distance ${distance.toFixed(1)})`,
      );
    }
  });

  test("code after a template literal is still highlighted", async () => {
    // The regression that motivated the frame-stack rewrite: an abandoned
    // template chunk used to re-scan the rest of the source as one string,
    // so everything past the first backtick painted as a string.
    await highlight();
    const start = offsetOf("let");
    const colors = await page.colorsIn(rangeRects("one", start, start + 3));
    const asKeyword = nearestColor(colors, theme.keyword);
    const asString = nearestColor(colors, theme.string);
    assert(
      asKeyword.distance <= COLOR_TOLERANCE,
      `"let" after a template literal should paint as a keyword, nearest was ${asKeyword.color}`,
    );
    assert(
      asKeyword.distance < asString.distance,
      "it must not have been swallowed by the template literal's string range",
    );
  });

  test("refresh repaints and dispose removes the highlights", async () => {
    await highlight();
    await page.evaluate(`
      window.handles.one.refresh("const x = 1;");
      return true;
    `);
    await page.waitFor(`document.getElementById("one").textContent === "const x = 1;"`, {
      label: "the debounced refresh to repaint",
    });

    const afterRefresh = await page.evaluate(`
      return [...CSS.highlights.keys()].filter((n) => n.startsWith("sh-")).length;
    `);
    assert(afterRefresh > 0, "refresh leaves highlights registered");

    await page.evaluate(`
      window.handles.one.dispose();
      delete window.handles.one;
      return true;
    `);
    const afterDispose = await page.evaluate(`
      return [...CSS.highlights.keys()].filter((n) => n.startsWith("sh-")).length;
    `);
    assertEquals(afterDispose, 0, "dispose clears every highlight it owned");
  });

  test("two highlighted elements coexist on one page", async () => {
    await highlight("const a = 1;", "one");
    await highlight('let b = "two";', "two");
    const state = await page.evaluate(`
      const ranges = (name) => CSS.highlights.get(name)?.size ?? 0;
      return {
        keywords: ranges("sh-keyword"),
        strings: ranges("sh-string"),
        one: document.getElementById("one").textContent,
        two: document.getElementById("two").textContent,
      };
    `);
    assertEquals(state.one, "const a = 1;");
    assertEquals(state.two, 'let b = "two";');
    assertEquals(state.keywords, 2, "both elements' keywords are in the shared highlight");
    assertEquals(state.strings, 1);

    // Disposing one must not take the other's ranges with it.
    await page.evaluate(`
      window.handles.one.dispose();
      delete window.handles.one;
      return true;
    `);
    const remaining = await page.evaluate(`
      return CSS.highlights.get("sh-keyword")?.size ?? 0;
    `);
    assertEquals(remaining, 1, "the surviving renderer keeps its own ranges");
  });

  test("an unrelated page highlight survives ours", async () => {
    await page.evaluate(`
      const node = document.getElementById("two").firstChild;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 3);
      CSS.highlights.set("app-search", new Highlight(range));
      return true;
    `);
    await highlight("const c = 3;", "one");
    const survived = await page.evaluate(`return CSS.highlights.has("app-search");`);
    assert(survived, "the library must not clear highlights it does not own");
  });

  test("forcing the dark theme repaints in the dark palette", async () => {
    await highlight();
    const start = offsetOf("const");
    const light = await page.colorsIn(rangeRects("one", start, start + 5));

    await page.evaluate(`
      document.documentElement.dataset.shTheme = "dark";
      return true;
    `);
    const dark = await page.colorsIn(rangeRects("one", start, start + 5));

    const lightMatch = nearestColor(light, theme.keyword);
    const darkMatch = nearestColor(dark, theme.keyword);
    assert(
      lightMatch.distance <= COLOR_TOLERANCE,
      `light keyword should be ~${theme.keyword}, was ${lightMatch.color}`,
    );
    assert(
      darkMatch.distance > lightMatch.distance,
      `forcing dark should move the keyword off the light palette (light ${lightMatch.color}, dark ${darkMatch.color})`,
    );

    await page.evaluate(`
      delete document.documentElement.dataset.shTheme;
      return true;
    `);
  });
}
