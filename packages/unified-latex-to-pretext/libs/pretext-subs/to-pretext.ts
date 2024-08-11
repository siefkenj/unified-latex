import * as Xast from "xast";
import { x } from "xastscript";
import {
    extractFromHtmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    divisions,
    isMappedEnviron,
} from "../pre-conversion-subs/break-on-boundaries";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

function formatNodeForError(node: Ast.Node | any): string {
    try {
        return printRaw(node);
    } catch {}
    return JSON.stringify(node);
}

type XastNode = Xast.Element | Xast.Text | Xast.Comment;

/**
 * Create a `toPretext` function that will log by making a call to `logger`.
 */
export function toPretextWithLoggerFactory(
    logger: (message: string, node: any) => void
) {
    /**
     * Convert Ast.Node to Hast nodes.
     */
    return function toPretext(
        node: Ast.Node | Ast.Argument
    ): XastNode | XastNode[] {
        // Because `isHtmlLikeTag` is a type guard, if we use it directly on
        // `node` here, then in the switch statement `node.type === "macro"` will be `never`.
        // We rename the variable to avoid this issue.
        const htmlNode = node;
        if (isHtmlLikeTag(htmlNode)) {
            const extracted = extractFromHtmlLike(htmlNode);
            const attributes: Record<string, any> = extracted.attributes;
            return x(
                extracted.tag,
                attributes,
                extracted.content.flatMap(toPretext)
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
                return x("m", printRaw(node.content));
            case "mathenv":
            case "displaymath":
                return x("me", printRaw(node.content));
            case "verb":
            case "verbatim":
                return x("pre", node.content);
            case "whitespace":
                return { type: "text", value: " ", position: node.position };
            case "parbreak":
                // warn first
                logger(
                    `There is no equivalent for parbreak, so it was replaced with an empty string.`,
                    node
                );

                // return an empty string
                return {
                    type: "text",
                    value: "",
                    position: node.position,
                };
            case "group":
                // Groups are just ignored.
                return node.content.flatMap(toPretext);
            case "environment":
                // check if it's a new environment made to replace a division node
                if (isMappedEnviron(node)) {
                    // get the division macro associated with this node
                    let divisionName = divisions.find(
                        (x) => x.mappedEnviron === node.env
                    )?.division;

                    // for subparagraph, give a warning since pretext has no equivalent tag
                    if (divisionName === "subparagraph") {
                        logger(
                            `There is no equivalent tag for "subparagraph", so it was replaced with a "paragraphs." tag`,
                            node
                        );
                    }

                    // paragraph and subparagraph become paragraphs
                    if (
                        divisionName === "paragraph" ||
                        divisionName === "subparagraph"
                    ) {
                        divisionName = "paragraphs";
                    }

                    // create a title tag containing the division macro's title arg
                    const title = getArgsContent(node)[0];

                    const titleTag = x("title", title?.flatMap(toPretext));

                    if (divisionName && title) {
                        return x(divisionName, [
                            titleTag,
                            ...node.content.flatMap(toPretext),
                        ]);
                    }
                }

                logger(
                    `Unknown environment when converting to HTML \`${formatNodeForError(
                        node.env
                    )}\``,
                    node
                );
                return x("div", node.content.flatMap(toPretext));
            case "macro":
                logger(
                    `Unknown macro when converting to HTML \`${formatNodeForError(
                        node
                    )}\``,
                    node
                );
                return x("span", (node.args || []).map(toPretext).flat());
            case "argument":
                return x(
                    "span",
                    {
                        "data-open-mark": node.openMark,
                        "data-close-mark": node.closeMark,
                    },
                    printRaw(node.content)
                );
            case "root":
                return node.content.flatMap(toPretext);
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
export const toPretext = toPretextWithLoggerFactory(console.warn);
