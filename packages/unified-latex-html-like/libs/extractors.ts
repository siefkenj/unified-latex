import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import { printRaw } from "../../unified-latex-util-print-raw";
import { getAttributeNameFromString, getTagNameFromString } from "./mangle";

/**
 * Extract the contents/attributes/tag from an html-like macro.
 */
export function extractFromHtmlLike(macro: Ast.Macro): {
    tag: string;
    attributes: Record<string, string | number | boolean | object>;
    content: Ast.Node[];
} {
    if (!isHtmlLikeTag(macro)) {
        throw new Error(
            "Attempting to extract html contents from a node that is not html-like."
        );
    }
    const args = macro.args || [];
    if (args.length > 1) {
        throw new Error(
            `html-like macros should have 0 or 1 args, but ${args.length} found`
        );
    }
    const argContent = args.length > 0 ? args[0].content : [];

    const tag = getTagNameFromString(macro.content);
    const attributes: Record<string, string | number | boolean | object> = {};
    let i = 0;
    for (; i < argContent.length; i++) {
        const node = argContent[i];
        if (isHtmlLikeAttribute(node)) {
            const attrName = getAttributeNameFromString(node.content);
            let attrValue: string | boolean | number | object = true;
            if (node.args && node.args.length > 0) {
                attrValue = JSON.parse(printRaw(node.args[0].content));
            }
            attributes[attrName] = attrValue;
            continue;
        }
        break;
    }

    return { tag, attributes, content: argContent.slice(i) };
}

/**
 * Determine whether the node is an html-like macro.
 */
export function isHtmlLike(node: any): node is Ast.Macro {
    return match.macro(node) && node.content.startsWith("html-");
}

/**
 * Determine whether the node is an html-like macro for a tag.
 */
export function isHtmlLikeTag(node: any): node is Ast.Macro {
    return match.macro(node) && node.content.startsWith("html-tag:");
}

/**
 * Determine whether the node is an html-like macro for an attribute.
 */
export function isHtmlLikeAttribute(node: any): node is Ast.Macro {
    return match.macro(node) && node.content.startsWith("html-attr:");
}
