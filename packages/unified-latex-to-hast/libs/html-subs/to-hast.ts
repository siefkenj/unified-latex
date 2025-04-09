import * as Hast from "hast";
import { h } from "hastscript";
import {
    extractFromHtmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

function formatNodeForError(node: Ast.Node | any): string {
    try {
        return printRaw(node);
    } catch {}
    return JSON.stringify(node);
}

type HastNode = Hast.Element | Hast.Text | Hast.Comment;

/**
 * Create a `toHast` function that will log by making a call to `logger`.
 */
export function toHastWithLoggerFactory(
    logger: (message: string, node: any) => void
) {
    /**
     * Convert Ast.Node to Hast nodes.
     */
    return function toHast(
        node: Ast.Node | Ast.Argument
    ): HastNode | HastNode[] {
        // Because `isHtmlLikeTag` is a type guard, if we use it directly on
        // `node` here, then in the switch statement `node.type === "macro"` will be `never`.
        // We rename the variable to avoid this issue.
        const htmlNode = node;
        if (isHtmlLikeTag(htmlNode)) {
            const extracted = extractFromHtmlLike(htmlNode);
            const attributes: Record<string, any> = extracted.attributes;
            return h(
                extracted.tag,
                attributes,
                extracted.content.flatMap(toHast)
            );
        }

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
                return h("code", { className: node.env }, node.content);
            case "verbatim":
                return h("pre", { className: node.env }, node.content);
            case "whitespace":
                return { type: "text", value: " ", position: node.position };
            case "parbreak":
                return h("br");
            case "group":
                // Groups are just ignored.
                return node.content.flatMap(toHast);
            case "environment":
                logger(
                    `Unknown environment when converting to HTML \`${formatNodeForError(
                        node.env
                    )}\``,
                    node
                );
                return h(
                    "div",
                    { className: ["environment", printRaw(node.env)] },
                    node.content.flatMap(toHast)
                );
            case "macro":
                logger(
                    `Unknown macro when converting to HTML \`${formatNodeForError(
                        node
                    )}\``,
                    node
                );
                return h(
                    "span",
                    { className: ["macro", `macro-${node.content}`] },
                    (node.args || []).map(toHast).flat()
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
                return node.content.flatMap(toHast);
            default: {
                const _exhaustiveCheck: never = node;
                throw new Error(
                    `Unknown node type; cannot convert to HAST ${JSON.stringify(
                        node
                    )}`
                );
            }
        }
    };
}

/**
 * Convert Ast.Node to Hast nodes.
 */
export const toHast = toHastWithLoggerFactory(console.warn);
