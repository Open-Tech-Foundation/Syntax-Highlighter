import { DocsLayout } from "@opentf/web-docs";
import config from "../../otfw.config.js";
import { docsTheme } from "../docs-theme.js";

const docsStyleAdjustments =
  ".otfw-navbar-actions .otfw-tooltip-bubble{left:auto;right:0;transform:translateY(3px)}.otfw-navbar-actions .otfw-tooltip:hover .otfw-tooltip-bubble,.otfw-navbar-actions .otfw-tooltip:focus-within .otfw-tooltip-bubble{transform:translateY(0)}.otfw-footer{display:none}";

export default function Layout(props) {
  return (
    <>
      <style>{docsTheme}</style>
      <style>{docsStyleAdjustments}</style>
      <DocsLayout config={config.docs}>{props.children}</DocsLayout>
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
    </>
  );
}
