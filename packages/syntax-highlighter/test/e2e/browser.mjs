/**
 * A dependency-free browser driver for the end-to-end tests.
 *
 * The library's whole premise — paint source code through the CSS Custom
 * Highlight API without touching the DOM — is only observable in a browser
 * that actually implements it. The unit tests stub `CSS.highlights`, so they
 * can tell you a range was registered but never that a glyph came out red.
 *
 * Rather than take on a browser-automation dependency for a package with no
 * runtime dependencies at all, this speaks the Chrome DevTools Protocol over
 * the runtime's own `WebSocket`. It is deliberately small: launch a browser,
 * load a page, evaluate an expression, sample painted pixels, shut down.
 */
import { Command } from "runtime:system";
import { serve } from "runtime:http";
import { file, makeTempDir, mkdir, remove } from "runtime:fs";
import { extname, join, normalize, resolve, sep } from "runtime:path";
import { env } from "runtime:process";

const BROWSERS = ["chromium", "google-chrome", "google-chrome-stable", "chrome"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
};

/**
 * The browser to drive, or `null` when there is none. Callers register no
 * tests when this returns null, so a machine without Chrome reports the
 * suite as skipped rather than failing it.
 */
export async function findBrowser() {
  const configured = env.CHROME_PATH;
  const candidates = configured ? [String(configured)] : BROWSERS;
  // The runtime jails the filesystem to the package, so /usr/bin is not
  // stat-able from here. Command resolves a bare name on the host PATH, so
  // asking each candidate for its version both finds it and proves it runs.
  for (const name of candidates) {
    try {
      const probe = await new Command(name, {
        args: ["--version"],
        inheritEnv: true,
        timeout: 10_000,
      }).output();
      if (probe.success) return name;
    } catch {
      continue;
    }
  }
  return null;
}

/** Serve `root` over HTTP. Module scripts need a real origin, not file://. */
export async function serveDirectory(root) {
  const base = resolve(root);
  const server = serve({ hostname: "127.0.0.1", port: 0 }, async (request) => {
    const { pathname } = new URL(request.url);
    let path = normalize(decodeURIComponent(pathname));
    if (path.endsWith("/")) path += "index.html";
    const target = join(base, path);
    // Serve only from under the root, whatever the request asks for.
    if (target !== base && !target.startsWith(base + sep)) {
      return new Response("forbidden", { status: 403 });
    }
    const handle = file(target);
    if (!(await handle.exists())) return new Response("not found", { status: 404 });
    return new Response(handle.stream(), {
      headers: {
        "content-type": MIME[extname(target)] ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  });
  const { port } = await server.addr;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => server.stop(),
  };
}

/** Launch a headless browser and attach to its first page. */
export async function openBrowser(executable) {
  // The runtime's temp dirs land under the root jail rather than the OS temp
  // directory, so park browser profiles somewhere already ignored by git —
  // a crashed run must not leave junk staged in the package.
  const profileRoot = "node_modules/.tmp";
  await mkdir(profileRoot, { recursive: true });
  const profile = await makeTempDir({ dir: profileRoot, prefix: "sh-e2e-" });
  const child = await new Command(executable, {
    args: [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--disable-extensions",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      // Keep the run off the desktop keyring, which prints errors and can hang.
      "--password-store=basic",
      "--use-mock-keychain",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    stdout: "null",
    stderr: "piped",
    inheritEnv: true,
  }).spawn();

  const browserWs = await readDebuggerUrl(child);
  const port = new URL(browserWs).port;
  const page = await waitForPageTarget(port);

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    socket.addEventListener("open", ok, { once: true });
    socket.addEventListener("error", () => fail(new Error("CDP socket failed")), {
      once: true,
    });
  });

  let nextId = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      const settle = pending.get(message.id);
      pending.delete(message.id);
      if (settle) settle(message);
      return;
    }
    const waiting = events.get(message.method);
    if (waiting) {
      events.delete(message.method);
      for (const ok of waiting) ok(message.params);
    }
  });

  function send(method, params = {}) {
    return new Promise((ok, fail) => {
      const id = ++nextId;
      pending.set(id, (message) => {
        if (message.error) fail(new Error(`${method}: ${message.error.message}`));
        else ok(message.result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  function once(method) {
    return new Promise((ok) => {
      const waiting = events.get(method) ?? [];
      waiting.push(ok);
      events.set(method, waiting);
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");

  /** Evaluate in the page. Promises are awaited; page exceptions rethrow here. */
  async function evaluate(expression) {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression: `(async () => { ${expression} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      const detail = exceptionDetails.exception?.description ?? exceptionDetails.text;
      throw new Error(`page threw: ${detail}`);
    }
    return result.value;
  }

  return {
    async goto(url) {
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url });
      await loaded;
    },

    evaluate,

    /** Poll `expression` until it is truthy, so tests never sleep blindly. */
    async waitFor(expression, { timeout = 10_000, label = expression } = {}) {
      const deadline = Date.now() + timeout;
      for (;;) {
        if (await evaluate(`return !!(${expression});`)) return;
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
        await sleep(25);
      }
    },

    /** Click an element and let the page settle. */
    async click(selector) {
      await evaluate(`
        const target = document.querySelector(${JSON.stringify(selector)});
        if (!target) throw new Error("no element for ${selector}");
        target.click();
        return true;
      `);
    },

    /**
     * Every colour painted inside `rectsExpression` — a page expression
     * returning DOMRects — most-used first, as `"r,g,b"` strings.
     *
     * There are no per-token elements to select, since not touching the DOM
     * is the point, so callers build rects from a Range over the source text
     * node: the same thing the highlight itself is painted through.
     *
     * The screenshot is decoded by the browser's own image pipeline rather
     * than by a PNG decoder written for the tests.
     */
    async colorsIn(rectsExpression) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      return evaluate(`
        const rects = ${rectsExpression};
        if (!rects.length) throw new Error("no rects to sample");
        const image = new Image();
        image.src = "data:image/png;base64,${data}";
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const counts = new Map();
        for (const rect of rects) {
          const { data: pixels } = context.getImageData(
            Math.round(rect.left),
            Math.round(rect.top),
            Math.max(1, Math.round(rect.width)),
            Math.max(1, Math.round(rect.height)),
          );
          for (let i = 0; i < pixels.length; i += 4) {
            const key = pixels[i] + "," + pixels[i + 1] + "," + pixels[i + 2];
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
        return [...counts].sort((a, b) => b[1] - a[1]).map(([key]) => key);
      `);
    },

    async close() {
      try {
        socket.close();
      } catch {
        /* the socket is already gone */
      }
      await child.kill();
      await child.status;
      await remove(profile, { recursive: true }).catch(() => {});
    },
  };
}

/** Chrome prints `DevTools listening on ws://…` to stderr once it is up. */
async function readDebuggerUrl(child) {
  const reader = child.stderr.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  const deadline = Date.now() + 20_000;
  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const match = buffered.match(/ws:\/\/\S+/);
      if (match) return match[0];
    }
  } finally {
    reader.releaseLock();
  }
  throw new Error(`browser did not report a debugging port:\n${buffered}`);
}

/** The debugging port answers /json/list a moment after it starts listening. */
async function waitForPageTarget(port) {
  const deadline = Date.now() + 10_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch (error) {
      lastError = error;
    }
    await sleep(50);
  }
  throw new Error(`browser opened no page target: ${lastError ?? "none listed"}`);
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/**
 * A page expression yielding the client rects of `source[start:end]` inside
 * the element with the given id — the rects the highlight paints over.
 */
export function rangeRects(elementId, start, end) {
  return `(() => {
    const node = document.getElementById(${JSON.stringify(elementId)}).firstChild;
    const range = document.createRange();
    range.setStart(node, ${start});
    range.setEnd(node, ${end});
    return [...range.getClientRects()];
  })()`;
}

/** `#rrggbb` -> `"r,g,b"`, matching what colorsIn() returns. */
export function rgbKey(hex) {
  const int = Number.parseInt(hex.replace("#", ""), 16);
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
}

/**
 * The painted colour nearest `hex` among `colors`, and how far off it is.
 * Glyph edges antialias toward the background, so an exact match only
 * appears in the solid core of a stroke; nearest-plus-distance is a stabler
 * assertion than exact membership.
 */
export function nearestColor(colors, hex) {
  const [wantR, wantG, wantB] = rgbKey(hex).split(",").map(Number);
  let best = null;
  let bestDistance = Infinity;
  for (const color of colors) {
    const [r, g, b] = color.split(",").map(Number);
    const distance = Math.hypot(r - wantR, g - wantG, b - wantB);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return { color: best, distance: bestDistance };
}

/** Read the `--sh-*` custom properties out of the shipped theme stylesheet. */
export async function themeColors(cssPath) {
  const css = await file(cssPath).text();
  const open = css.indexOf(":root {");
  const block = css.slice(open, css.indexOf("}", open));
  const colors = {};
  for (const [, name, value] of block.matchAll(/--sh-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    colors[name] = value;
  }
  return colors;
}
