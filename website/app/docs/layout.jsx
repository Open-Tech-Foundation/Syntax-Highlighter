import { DocsLayout } from "@opentf/afw-docs";
import config from "../../afw.config.js";

// The root layout provides the navbar and footer; `frame={false}` renders only
// the docs sidebar · content · TOC grid inside that shared shell.
export default function Layout(props) {
  return (
    <DocsLayout config={config.docs} frame={false}>
      {props.children}
    </DocsLayout>
  );
}
