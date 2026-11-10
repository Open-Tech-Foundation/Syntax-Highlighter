import { defineDocsConfig } from "@opentf/afw-docs/config";

const GITHUB = "https://github.com/Open-Tech-Foundation/Syntax-Highlighter";

export default defineDocsConfig({
  // Canonical site origin — required for production builds (absolute feed/OG URLs).
  site: { url: "https://syntax-highlighter.opentechf.org", title: "Syntax Highlighter" },
  docs: {
    title: "Syntax Highlighter",
    description: "Renderer-agnostic semantic syntax highlighting.",
    version: "v0.4.0",
    // Navbar search (static index built after prerendering, into dist/_search/).
    search: { provider: "afw" },
    // Per-page "Last updated" line, from the file's last git commit.
    lastUpdated: true,
    homeUrl: "/",
    github: GITHUB,
    // Enables the per-page "Edit this page" link (with `lastUpdated`).
    repoUrl: GITHUB,
    nav: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs" },
    ],
  },
});
