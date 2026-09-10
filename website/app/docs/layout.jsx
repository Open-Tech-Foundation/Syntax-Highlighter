import { DocsLayout } from "@opentf/web-docs";
import config from "../../otfw.config.js";
import { docsTheme } from "../docs-theme.js";

export default function Layout(props) {
  return (
    <>
      <style>{docsTheme}</style>
      <DocsLayout config={config.docs}>{props.children}</DocsLayout>
    </>
  );
}
