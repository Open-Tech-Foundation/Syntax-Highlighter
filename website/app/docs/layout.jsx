import { DocsLayout } from "@opentf/afw-docs";
import config from "../../afw.config.js";
import SiteFooter from "../site-footer.jsx";

const docsStyleAdjustments =
  ".afwd-navbar-actions .afwd-tooltip-bubble{left:auto;right:0;transform:translateY(3px)}.afwd-navbar-actions .afwd-tooltip:hover .afwd-tooltip-bubble,.afwd-navbar-actions .afwd-tooltip:focus-within .afwd-tooltip-bubble{transform:translateY(0)}.afwd-footer{display:none}";

export default function Layout(props) {
  return (
    <>
      <style>{docsStyleAdjustments}</style>
      <DocsLayout config={config.docs}>{props.children}</DocsLayout>
      <SiteFooter />
    </>
  );
}
