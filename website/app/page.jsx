import { Navbar } from "@opentf/web-docs";
import config from "../otfw.config.js";
import { landingThemeStyles } from "./landing-theme.js";

const CodeLine = (props) => <div class="code-line">{props.children}</div>;

export default function Home() {
  return (
    <main class="marketing">
      <style>{landingThemeStyles}</style>
      <Navbar config={config.docs} />

      <section class="hero-grid">
        <div class="hero-copy">
          <a
            class="release"
            href="https://github.com/Open-Tech-Foundation/Syntax-Highlighter/releases"
          >
            <span class="release-dot" /> Open source · TypeScript <b>See releases →</b>
          </a>
          <h1>
            Code that looks <em>right</em>
            <br /> wherever it renders.
          </h1>
          <p class="lede">
            One semantic tokenizer for browser highlights, accessible HTML, JSON tooling, and ANSI
            terminals.
          </p>
          <div class="actions">
            <a class="button" href="/docs/getting-started">
              Get started <span>→</span>
            </a>
            <a class="text-link" href="/docs">
              Browse documentation
            </a>
          </div>
          <section class="runtime-row" aria-label="Supported environments">
            <span>Browser</span>
            <i /> <span>Node.js</span>
            <i /> <span>Bun</span>
            <i /> <span>SSR</span>
          </section>
        </div>

        <section class="editor-shell" aria-label="Syntax highlighted TypeScript example">
          <div class="editor-topbar">
            <div class="window-dots">
              <i />
              <i />
              <i />
            </div>
            <span>theme.ts</span>
            <span class="language-pill">TypeScript</span>
          </div>
          <pre class="code-sample">
            <code>
              <CodeLine>
                <span class="ln">1</span>
                <span class="token keyword">import</span> {"{ highlight }"}{" "}
                <span class="token keyword">from</span>{" "}
                <span class="token string">"@opentf/syntax-highlighter"</span>
                {";"}
              </CodeLine>
              <CodeLine>
                <span class="ln">2</span>
              </CodeLine>
              <CodeLine>
                <span class="ln">3</span>
                <span class="token keyword">const</span> <span class="token variable">source</span>{" "}
                <span class="token operator">=</span>{" "}
                <span class="token string">
                  {"\u0060"}const answer = 42{"\u0060"}
                </span>
                ;
              </CodeLine>
              <CodeLine>
                <span class="ln">4</span>
                <span class="token keyword">const</span> <span class="token variable">tokens</span>{" "}
                <span class="token operator">=</span> <span class="token function">highlight</span>
                (source, <span class="token string">"typescript"</span>);
              </CodeLine>
              <CodeLine>
                <span class="ln">5</span>
              </CodeLine>
              <CodeLine>
                <span class="ln">6</span>
                <span class="token comment">
                  {"// Render to any surface without changing the source."}
                </span>
              </CodeLine>
              <CodeLine>
                <span class="ln">7</span>
                <span class="token function">renderHTML</span>(source, tokens);
              </CodeLine>
            </code>
          </pre>
          <div class="editor-footer">
            <span>
              <i class="status-dot" /> 7 tokens classified
            </span>
            <span>UTF-8</span>
          </div>
        </section>
      </section>

      <section class="proof" aria-label="Library qualities">
        <div>
          <b>One input</b>
          <span>source code</span>
        </div>
        <strong>→</strong>
        <div>
          <b>One tokenizer</b>
          <span>semantic tokens</span>
        </div>
        <strong>→</strong>
        <div>
          <b>Any renderer</b>
          <span>web · HTML · JSON · ANSI</span>
        </div>
      </section>

      <section class="features">
        <article>
          <span class="feature-icon">◇</span>
          <h2>Semantic by design</h2>
          <p>Tokens carry meaning beyond color: headings, links, delimiters, emphasis, and more.</p>
          <a href="/docs/renderers">Explore renderers →</a>
        </article>
        <article>
          <span class="feature-icon">⌁</span>
          <h2>Native when possible</h2>
          <p>Use CSS Custom Highlights in the browser and avoid a forest of syntax spans.</p>
          <a href="/docs">Read the approach →</a>
        </article>
        <article>
          <span class="feature-icon">↗</span>
          <h2>Built for every surface</h2>
          <p>
            Keep output consistent across a live editor, server render, developer tool, and
            terminal.
          </p>
          <a href="/docs/getting-started">Start integrating →</a>
        </article>
      </section>

      <section class="bottom-cta">
        <p>Bring your code to every surface.</p>
        <a class="button" href="/docs/getting-started">
          Read the quickstart <span>→</span>
        </a>
      </section>
      <footer class="site-footer">
        <div class="site-footer-inner">
          <div class="site-footer-org">
            <a
              class="site-footer-org-link"
              href="https://opentechf.org/"
              target="_blank"
              rel="noreferrer"
            >
              <span class="otf-mark" aria-hidden="true">
                OTF
              </span>
              <span>© Open Tech Foundation</span>
            </a>
            <span class="site-footer-license">— MIT</span>
          </div>
          <a
            class="site-footer-badge"
            href="https://web.opentechf.org/"
            target="_blank"
            rel="noreferrer"
            aria-label="Built with OTF Web"
          >
            <span class="site-footer-badge-mark" aria-hidden="true">
              ▦
            </span>
            <span class="site-footer-badge-copy">
              <span class="site-footer-badge-muted">Built with</span>
              <span class="site-footer-badge-brand">
                <b>OTF</b> Web
              </span>
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}
