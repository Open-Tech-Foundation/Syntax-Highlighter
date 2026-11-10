import { globalStyles } from "./global.js";

// Site-wide SEO defaults, merged under every route's own `metadata`: the
// template brands each page title, and the description stands in for a page
// that has none. Canonical and og:url come from each page's path.
export const metadata = {
  titleTemplate: "%s — Syntax Highlighter",
  description:
    "Renderer-agnostic syntax highlighting: one semantic tokenizer for browser highlights, HTML/SSR, JSON, and ANSI terminals.",
  openGraph: { siteName: "Syntax Highlighter", type: "website" },
  meta: [{ property: "og:locale", content: "en_US" }],
};

// The afw-docs theme is loaded once from app/global.css (index.html); this adds
// the site's own base styles.
export default function Layout(props) {
  return (
    <>
      <style>{globalStyles}</style>
      {props.children}
    </>
  );
}
