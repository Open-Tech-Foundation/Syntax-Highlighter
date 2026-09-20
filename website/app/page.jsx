import { Navbar } from "@opentf/web-docs";
import config from "../otfw.config.js";
import DemoSection from "./demo-section.jsx";
import HeroTabs from "./hero-tabs.jsx";
import { landingThemeStyles } from "./landing-theme.js";
import SiteFooter from "./site-footer.jsx";

export default function Home() {
  return (
    <>
      <style>{landingThemeStyles}</style>
      <Navbar config={config.docs} />
      <main class="marketing">
        <section class="hero-grid">
          <div class="hero-copy">
            <span class="release release-alpha">
              <span class="release-dot" /> Alpha
            </span>
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
            </div>
            <section class="runtime-row" aria-label="Supported environments">
              <span>Browser</span>
              <i /> <span>Node.js</span>
              <i /> <span>Deno</span>
              <i /> <span>Bun</span>
              <i /> <span>Next.js</span>
              <i /> <span>Edge</span>
              <i /> <span>SSR</span>
            </section>
          </div>

          <HeroTabs />
        </section>

        <DemoSection />

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
            <p>
              Tokens carry meaning beyond color: headings, links, delimiters, emphasis, and more.
            </p>
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
      </main>
      <SiteFooter />
    </>
  );
}
