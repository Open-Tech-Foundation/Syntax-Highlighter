// Shared org footer: OTF logo, copyright, license, and builder badge.
// Used by the landing page and the docs layout so both stay identical.
export default function SiteFooter() {
  return (
    <footer class="site-footer">
      <div class="site-footer-inner">
        <div class="site-footer-org">
          <a
            class="site-footer-org-link"
            href="https://opentechf.org/"
            target="_blank"
            rel="noreferrer"
          >
            <img
              class="site-footer-logo"
              src="/img/otf-logo.svg"
              alt="Open Tech Foundation"
              width="25"
              height="25"
            />
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
  );
}
