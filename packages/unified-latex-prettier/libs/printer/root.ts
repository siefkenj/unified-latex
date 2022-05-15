import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import * as PrettierTypes from "./prettier-types";
import { getNodeInfo, fill, formatDocArray } from "./common";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Returns true if a `\documentclass` macro is detected,
 * which would indicate that the node list contains the preamble.
 *
 * @param {[object]} nodes
 */
export function hasPreambleCode(nodes: Ast.Node[]) {
    return nodes.some((node) => match.macro(node, "documentclass"));
}

export function printRoot(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Root;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const content = path.map(print, "content");
    const rawContent = formatDocArray(node.content, content, options);

    const concatFunction = hasPreambleCode(node.content) ? (x: any) => x : fill;
    return concatFunction(rawContent);
}
