import { globalStyles } from "./global.js";

export default function Layout(props) {
  return (
    <>
      <style>{globalStyles}</style>
      {props.children}
    </>
  );
}
