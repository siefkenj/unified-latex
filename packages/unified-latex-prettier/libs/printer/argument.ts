import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import * as PrettierTypes from "./prettier-types";
import {
    getNodeInfo,
    formatDocArray,
    hardline,
    join,
    ifBreak,
    breakParent,
    line,
    group,
    indent,
    softline,
    fill,
} from "./common";
import {
    linebreak,
    printRaw,
} from "@unified-latex/unified-latex-util-print-raw";
import { parsePgfkeys } from "@unified-latex/unified-latex-util-pgfkeys";
import { match } from "@unified-latex/unified-latex-util-match";
import { trim } from "@unified-latex/unified-latex-util-trim";

export function printArgument(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Argument;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    // We can return early for empty arguments (this is common for omitted optional arguments)
    if (
        node.openMark === "" &&
        node.closeMark === "" &&
        node.content.length === 0
    ) {
        return [];
    }

    const openMark = node.openMark;
    const closeMark = node.closeMark;
    let content = path.map(print, "content");
    content = formatDocArray(node.content, content, options);

    // if the last item is a comment, we need to insert a hardline
    if (match.comment(node.content[node.content.length - 1])) {
        content.push(hardline);
    }

    let rawRet: Doc[] = [openMark, fill(content), closeMark];
    if (renderInfo.inParMode) {
        // In paragraph node, arguments should flow just like text
        rawRet = [openMark, ...content, closeMark];
    }
    if (referenceMap) {
        // Save the raw rendered data in case a renderer higher up
        // wants to unwrap it
        referenceMap.setRenderCache(node, rawRet);
    }

    if (path.getParentNode()) {
        const parentNode = path.getParentNode();
        const { renderInfo: parentRenderInfo } = getNodeInfo(
            parentNode,
            options
        );
        if (parentRenderInfo.pgfkeysArgs) {
            const leadingComment =
                node.content.length > 0 &&
                match.comment(node.content[0]) &&
                node.content[0].sameline
                    ? node.content[0]
                    : null;
            const content = leadingComment
                ? node.content.slice(1)
                : node.content;
            trim(content);
            return printPgfkeysArgument(content, {
                openMark: node.openMark,
                closeMark: node.closeMark,
                leadingComment,
            });
        }
    }

    return rawRet;
}

/**
 * Format a sequence of Pgfkeys key-value pairs. `nodes` will be parsed
 * by a grammar defining Pgfkeys
 *
 * @param {Ast.Node[]} nodes
 * @param {{ openMark: string; closeMark: string; leadingComment: Ast.Comment | null }} braces - A `leadingComment` is a comment that appears as the first item in the environment (e.g. `\pgfkeys{%comment\na,b,c}`)
 * @returns {Doc}
 */
function printPgfkeysArgument(
    nodes: Ast.Node[],
    braces: {
        openMark: string;
        closeMark: string;
        leadingComment: Ast.Comment | null | undefined;
    }
): Doc {
    const parsed = parsePgfkeys(nodes);

    const content: Doc[] = [];
    for (const part of parsed) {
        const isLastItem = part === parsed[parsed.length - 1];

        if (part.itemParts) {
            // parts are printed using `printRaw`, `hardline` is used in place
            // of "\n"
            const parts = part.itemParts.map((node) =>
                printRaw(node, { asArray: true }).map((token) =>
                    token === linebreak ? hardline : token
                )
            );
            const row = join("=", parts);
            content.push(row);
            if (part.trailingComma) {
                content.push(",");
            }
        }
        if (part.trailingComment) {
            const leadingContent: Doc[] = part.itemParts ? [" "] : [];
            if (part.leadingParbreak) {
                // We preserve parbreaks before comments, so if we have
                // one, insert an extra hardline
                leadingContent.push(hardline);
            }

            content.push(
                ...leadingContent,
                // We're carefully and manually controlling the newlines,
                // so print the comment directly without any newlines
                "%",
                part.trailingComment.content,
                breakParent
            );
        }

        if (!isLastItem) {
            content.push(line);
        }
    }

    let leadingComment: Doc[] = [""];
    if (braces.leadingComment) {
        if (braces.leadingComment.leadingWhitespace) {
            leadingComment.push(" ");
        }
        leadingComment.push("%" + braces.leadingComment.content, breakParent);
    }

    return group([
        braces.openMark,
        ...leadingComment,
        // If there is no content, we don't want to push an extra `softline`.
        // This matters because the braces group could still be broken by `leadingComment`
        content.length > 0 ? indent([softline, ...content]) : "",
        softline,
        braces.closeMark,
    ]);
}
