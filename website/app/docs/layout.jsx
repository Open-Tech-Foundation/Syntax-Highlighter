import { DocsLayout } from "@opentf/web-docs";
import config from "../../otfw.config.js";
import { docsTheme } from "../docs-theme.js";
import SiteFooter from "../site-footer.jsx";

const docsStyleAdjustments =
  ".otfw-navbar-actions .otfw-tooltip-bubble{left:auto;right:0;transform:translateY(3px)}.otfw-navbar-actions .otfw-tooltip:hover .otfw-tooltip-bubble,.otfw-navbar-actions .otfw-tooltip:focus-within .otfw-tooltip-bubble{transform:translateY(0)}.otfw-footer{display:none}";

export default function Layout(props) {
  return (
    <>
      <style>{docsTheme}</style>
      <style>{docsStyleAdjustments}</style>
      <DocsLayout config={config.docs}>{props.children}</DocsLayout>
      <SiteFooter />
    </>
  );
}
