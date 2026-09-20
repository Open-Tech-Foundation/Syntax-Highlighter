import { defineDocsConfig } from "@opentf/web-docs/config";

export default defineDocsConfig({
  site: { url: "https://syntax-highlighter.opentechf.org", title: "Syntax Highlighter" },
  docs: {
    title: "Syntax Highlighter",
    description: "Renderer-agnostic semantic syntax highlighting.",
    version: "v0.4.0",
    search: { provider: "pagefind" },
    lastUpdated: true,
    homeUrl: "/",
    github: "https://github.com/Open-Tech-Foundation/Syntax-Highlighter",
    repoUrl: "https://github.com/Open-Tech-Foundation/Syntax-Highlighter",
    nav: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs" },
    ],
  },
});
