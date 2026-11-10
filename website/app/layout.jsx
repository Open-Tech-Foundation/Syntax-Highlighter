import { Navbar } from "@opentf/afw-docs";
import config from "../afw.config.js";
import SiteFooter from "./site-footer.jsx";

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

// Keep navbar action tooltips inside the viewport at the right edge.
const navbarTooltipFix =
  ".afwd-navbar-actions .afwd-tooltip-bubble{left:auto;right:0;transform:translateY(3px)}.afwd-navbar-actions .afwd-tooltip:hover .afwd-tooltip-bubble,.afwd-navbar-actions .afwd-tooltip:focus-within .afwd-tooltip-bubble{transform:translateY(0)}";

// Site-wide shell: the afw-docs Navbar and the organization footer wrap every
// route (landing and docs). The docs section renders `DocsLayout` with
// `frame={false}` so its sidebar · content · TOC grid slots inside this chrome.
// The afw-docs theme loads once from app/global.css (index.html); landing-page
// styles (global.js) load only on the landing page, so docs get the theme alone.
export default function RootLayout(props) {
  return (
    <div class="afwd-shell">
      <style>{navbarTooltipFix}</style>
      <Navbar config={config.docs} />
      <div class="afwd-shell-body">{props.children}</div>
      <SiteFooter />
    </div>
  );
}
