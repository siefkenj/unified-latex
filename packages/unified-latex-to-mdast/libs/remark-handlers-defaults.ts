import { Options as RehypeRemarkOptions } from "rehype-remark";
import { toString } from "hast-util-to-string";

export const defaultHandlers: RehypeRemarkOptions["handlers"] = {
    span(state, node, parent) {
        const className = (node.properties.className || []) as string[];
        if (className.includes("inline-math")) {
            // The HTML type prevents the output from being mangled (e.g., `_` turning into `\_`)
            return { type: "html", value: `$${toString(node)}$` };
        }
        return state.all(node);
    },
    div(state, node, parent) {
        const className = (node.properties.className || []) as string[];
        if (className.includes("display-math")) {
            return { type: "code", lang: "math", value: toString(node) };
        }
        return state.all(node);
    },
};
