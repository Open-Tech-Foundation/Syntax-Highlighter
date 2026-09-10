import { defineDocsConfig } from "@opentf/web-docs/config";

export default defineDocsConfig({
  site: { url: "https://syntax-highlighter.opentechf.org", title: "Syntax Highlighter" },
  docs: {
    title: "Syntax Highlighter",
    description: "Renderer-agnostic semantic syntax highlighting.",
    homeUrl: "/",
    github: "https://github.com/Open-Tech-Foundation/Syntax-Highlighter",
    repoUrl: "https://github.com/Open-Tech-Foundation/Syntax-Highlighter",
    nav: [
      { label: "Docs", href: "/docs", icon: "book" },
      { label: "Renderers", href: "/docs/renderers" },
    ],
  },
});
