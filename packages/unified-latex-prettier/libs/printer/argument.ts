import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import * as PrettierTypes from "./prettier-types";
import { getNodeInfo, formatDocArray, hardline, ifBreak, fill } from "./common";
import { match } from "@unified-latex/unified-latex-util-match";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { printTikzArgument } from "./tikz";
import { printArgumentPgfkeys } from "./print-argument-pgfkeys";

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
    if (match.blankArgument(node)) {
        return [];
    }
    const parentNode = path.getParentNode();
    const { renderInfo: parentRenderInfo } = getNodeInfo(parentNode, options);
    // We handle printing pgfkeys arguments manually
    if (parentRenderInfo.pgfkeysArgs) {
        const leadingComment =
            node.content.length > 0 &&
            match.comment(node.content[0]) &&
            node.content[0].sameline
                ? node.content[0]
                : null;
        const content = leadingComment ? node.content.slice(1) : node.content;
        trim(content);
        return printArgumentPgfkeys(content, {
            openMark: node.openMark,
            closeMark: node.closeMark,
            leadingComment,
        });
    }
    if (parentRenderInfo.tikzPathCommand) {
        return printTikzArgument(path, print, options);
    }

    // Regular argument printing
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

    return rawRet;
}
