import * as Xast from "xast";
import { x } from "xastscript";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * Direct and un-intelligent conversion of `Ast.Node` to a XAST element.
 * This function is not recursive! But, it will produce an output for every input.
 */
export function toPretextDirect(
    node: Ast.Node | Ast.Argument
): Xast.Element | Xast.Text | Xast.Comment {
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
            return x("m", printRaw(node.content));
        case "mathenv":
        case "displaymath":
            return x(
                "m",
                { className: "display-math" },
                printRaw(node.content)
            );
        case "whitespace":
            return { type: "text", value: " ", position: node.position };
        case "parbreak":
            return { type: "text", value: "\n", position: node.position };
        case "group":
            throw new Error("Not implemented");
        case "environment":
            throw new Error("Not implemented");
        case "macro":
            throw new Error("Not implemented");
        case "argument":
            throw new Error("Not implemented");
        case "verb":
            throw new Error("Not implemented");
        case "verbatim":
            throw new Error("Not implemented");
        case "root":
            return x("root");
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
