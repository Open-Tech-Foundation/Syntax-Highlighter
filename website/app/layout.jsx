import { docsTheme } from "./docs-theme.js";
import { globalStyles } from "./global.js";

export default function Layout(props) {
  return (
    <>
      <style>{docsTheme}</style>
      <style>{globalStyles}</style>
      {props.children}
    </>
  );
}
