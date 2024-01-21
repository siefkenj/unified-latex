import * as Hast from "hast";
import { h } from "hastscript";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * Direct and un-intelligent conversion of `Ast.Node` to a HAST element.
 * This function is not recursive! But, it will produce an output for every input.
 */
export function toHastDirect(
    node: Ast.Node | Ast.Argument
): Hast.Element | Hast.Text | Hast.Comment {
    switch (node.type) {
        case "string":
            return {
                type: "text",
                value: node.content,
                position: node.position,
            };
        case "comment":
            return {
                type: "comment",
                value: node.content,
                position: node.position,
            };
        case "inlinemath":
            return h(
                "span",
                { className: "inline-math" },
                printRaw(node.content)
            );
        case "mathenv":
        case "displaymath":
            return h(
                "div",
                { className: "display-math" },
                printRaw(node.content)
            );
        case "verb":
        case "verbatim":
            return h("pre", { className: node.env }, node.content);
        case "whitespace":
            return { type: "text", value: " ", position: node.position };
        case "parbreak":
            return h("br");
        case "group":
            return h("span", { className: "group" }, printRaw(node.content));
        case "environment":
            return h(
                "div",
                { className: ["environment", printRaw(node.env)] },
                printRaw(node.content)
            );
        case "macro":
            return h(
                "span",
                { className: ["macro", `macro-${node.content}`] },
                (node.args || []).map(toHastDirect)
            );
        case "argument":
            return h(
                "span",
                {
                    className: ["argument"],
                    "data-open-mark": node.openMark,
                    "data-close-mark": node.closeMark,
                },
                printRaw(node.content)
            );
        case "root":
            return h("root");
        case "hash_number":
            return {
                type: "text",
                value: `#${node.number}`,
            };
        default: {
            const _exhaustiveCheck: never = node;
            throw new Error(
                `Unknown node type; cannot convert to HAST ${JSON.stringify(
                    node
                )}`
            );
        }
    }
}
