import { all, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

export const lowlight = createLowlight(all);
export { toHtml };
