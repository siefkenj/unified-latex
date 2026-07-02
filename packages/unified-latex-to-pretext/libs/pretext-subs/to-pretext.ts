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

/** XML comments cannot contain `--` or end with `-`; adjust to keep the output well-formed. */
function makeComment(value: string): Xast.Comment {
    value = value.replace(/--/g, "- -");
    if (value.endsWith("-")) {
        value += " ";
    }
    return { type: "comment", value };
}

/**
 * Extract the original LaTeX source for a node using its position offsets.
 * Falls back to `printRaw`, which may be inaccurate if the node's children
 * were already transformed (e.g. into html-like macros).
 */
function nodeSource(node: Ast.Node | Ast.Argument, source?: string): string {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (source && start != null && end != null) {
        return source.slice(start, end);
    }
    return formatNodeForError(node);
}

/**
 * Build a `<TODO>` placeholder for unconvertible content.
 * Structure: `<TODO type="..."><!-- todo: ... --><pre>raw source</pre></TODO>`
 * (inline placeholders use `<c>` instead of `<pre>`).
 * The XML comment is compatible with PreTeXt's author.tools="yes" mechanism.
 * The schema-invalid `<TODO>` element surfaces as a validation error.
 */
function todoBlock(type: string, label: string, rawSource: string): Xast.Element {
    return x("TODO", { type }, [
        makeComment(`todo: ${label}`),
        x("pre", rawSource),
    ]);
}

/** Build a `<TODO>` placeholder for unconvertible inline content, using `<c>` instead of `<pre>`. */
function todoInline(type: string, label: string, rawSource: string): Xast.Element {
    return x("TODO", { type }, [
        makeComment(`todo: ${label}`),
        x("c", rawSource),
    ]);
}

/**
 * Create a `toPretext` function that will log by making a call to `logger`.
 * When `source` (the original LaTeX string) is provided, unknown macros and
 * environments are preserved verbatim inside `<TODO>` placeholders.
 */
export function toPretextWithLoggerFactory(
    logger: (message: string, node: any) => void,
    source?: string
) {
    /**
     * Convert Ast.Node to Xast nodes.
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
            case "comment": {
                const comment = makeComment(node.content);
                comment.position = node.position;
                // A comment absorbs the whitespace/newline around it. When
                // whitespace preceded it, or when the comment sat on its own
                // line (the line break acts as a space in LaTeX), re-emit a
                // space so surrounding text doesn't get glued together.
                if (node.leadingWhitespace || !node.sameline) {
                    return [{ type: "text", value: " " }, comment];
                }
                return comment;
            }
            case "inlinemath":
                return x("m", printRaw(node.content));
            case "mathenv":
            case "displaymath":
                return x("md", printRaw(node.content));
            case "verb":
                return x("c", node.content);
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
                    // get the division entry associated with this node
                    const divEntry = divisions.find(
                        (x) => x.mappedEnviron === node.env
                    );

                    // for subparagraph, give a warning since pretext has no equivalent tag
                    if (divEntry?.division === "subparagraph") {
                        logger(
                            `Warning: There is no equivalent tag for "subparagraph", "paragraphs" was used as a replacement.`,
                            node
                        );
                    }

                    // Use pretextTag if set, otherwise use the division macro name.
                    // subparagraph has no pretext equivalent, so it maps to "paragraphs".
                    let tagName =
                        divEntry?.pretextTag ??
                        divEntry?.division;
                    if (tagName === "subparagraph") {
                        tagName = "paragraphs";
                    }

                    // look for any additional attributes in renderInfo and add them to the attributes of the tag
                    const attributes: Record<string, any> = {};
                    if (node._renderInfo?.additionalAttributes) {
                        Object.assign(attributes, node._renderInfo.additionalAttributes);
                    }
                    // create a title tag containing the division macro's title arg
                    const title = getArgsContent(node)[0];

                    if (!title) {
                        logger(
                            `Warning: No title was given, so an empty title tag was used.`,
                            node
                        );
                    }

                    const titleTag = x("title", title?.flatMap(toPretext));

                    if (tagName) {
                        return x(tagName, attributes,
                            [
                            titleTag,
                            ...node.content.flatMap(toPretext),
                        ]);
                    }
                }

                logger(
                    `Unknown environment when converting to XML \`${formatNodeForError(
                        node.env
                    )}\``,
                    node
                );
                return todoBlock(
                    "unknown-environment",
                    `unknown environment "${printRaw(node.env)}"`,
                    nodeSource(node, source)
                );
            case "macro":
                logger(
                    `Unknown macro when converting to XML \`${formatNodeForError(
                        node
                    )}\``,
                    node
                );
                return todoInline(
                    "unknown-macro",
                    `unknown macro "\\${node.content}"`,
                    nodeSource(node, source)
                );
            case "argument":
                logger(
                    `Unknown argument when converting to XML \`${formatNodeForError(
                        node
                    )}\``,
                    node
                );
                return {
                    type: "text",
                    value: printRaw(node.content),
                    position: node.position,
                };
            case "root":
                return node.content.flatMap(toPretext);
            default: {
                const _exhaustiveCheck: never = node;
                throw new Error(
                    `Unknown node type; cannot convert to XAST ${JSON.stringify(
                        node
                    )}`
                );
            }
        }
    };
}

/**
 * Convert Ast.Node to Xast nodes.
 */
export const toPretext = toPretextWithLoggerFactory(console.warn);
