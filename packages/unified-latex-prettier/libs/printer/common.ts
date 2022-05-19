import { builders } from "prettier/doc";
import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import * as PrettierTypes from "./prettier-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { ReferenceMap } from "../reference-map";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Computes the environment name, start/end, and args.
 * E.g., for "\begin{x}abc\end{x}", it returns
 * ```
 * {
 *  envName: "x",
 *  start: "\\begin{x}",
 *  end: "\\end{x}",
 * }
 * ```
 *
 * @param {*} node
 * @returns
 */
export function formatEnvSurround(node: Ast.Environment) {
    const env = printRaw(node.env);

    return {
        envName: env,
        start: ESCAPE + "begin{" + env + "}",
        end: ESCAPE + "end{" + env + "}",
    };
}

/**
 * Determine if `elm` is a line type (softline/hardline/etc). If `elm` is an
 * array or a concat, the first element is checked.
 */
function isLineType(elm: Doc): boolean {
    if (elm == null || typeof elm === "string") {
        return false;
    }
    if (Array.isArray(elm)) {
        return isLineType(elm[0]);
    }
    if (elm.type === "concat") {
        return isLineType(elm.parts);
    }
    return elm.type === "line";
}

/**
 * Join an array with `softline`. However, if a `line` is
 * found, do not insert an additional softline. For example
 * `[a, b, c]` -> `[a, softline, b, softline, c]`
 *
 * but
 *
 * `[a, line, b, c]` -> `[a, line, b, softline, c]`
 *
 * @param {*} arr
 * @returns
 */
export function joinWithSoftline(arr: Doc[]) {
    if (arr.length === 0 || arr.length === 1) {
        return arr;
    }
    const ret = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
        const prevNode = arr[i - 1];
        const nextNode = arr[i];
        if (!isLineType(prevNode) && !isLineType(nextNode)) {
            ret.push(softline);
        }
        ret.push(nextNode);
    }
    return ret;
}

export function getNodeInfo(
    node: any,
    options: PrettierTypes.Options & { referenceMap?: ReferenceMap }
): {
    renderInfo: Record<string, any>;
    renderCache?: object;
    previousNode?: Ast.Node;
    nextNode?: Ast.Node;
    referenceMap?: ReferenceMap;
} {
    const renderInfo = node._renderInfo || {};
    const previousNode =
        options.referenceMap && options.referenceMap.getPreviousNode(node);
    const nextNode =
        options.referenceMap && options.referenceMap.getNextNode(node);
    const renderCache =
        options.referenceMap && options.referenceMap.getRenderCache(node);
    // It's useful to know whether we're the start or end node in an array,
    // so compute this information.
    return {
        renderInfo,
        renderCache,
        previousNode,
        nextNode,
        referenceMap: options.referenceMap,
    };
}

export const ESCAPE = "\\";

// Commands to build the prettier syntax tree
export const {
    group,
    fill,
    ifBreak,
    line,
    softline,
    hardline,
    lineSuffix,
    lineSuffixBoundary,
    breakParent,
    indent,
    markAsRoot,
    join,
} = builders;

/**
 * Given an array of nodes and the corresponding printed versions, prepares
 * a final Doc array. This function does things like ensures there are `hardlines`
 * around environments and that there aren't excess hardlines at the start or end.
 * It also unwraps `inParMode` macro contents.
 *
 * @export
 * @param {Ast.Node[]} nodes
 * @param {Doc[]} docArray
 * @param {*} options
 * @returns {Doc[]}
 */
export function formatDocArray(
    nodes: Ast.Node[],
    docArray: Doc[],
    options: any
): Doc[] {
    const ret: Doc[] = [];

    for (let i = 0; i < nodes.length; i++) {
        const rawNode = nodes[i];
        const printedNode = docArray[i];
        const { renderInfo, referenceMap, previousNode, nextNode } =
            getNodeInfo(rawNode, options);
        const renderCache =
            referenceMap && referenceMap.getRenderCache(rawNode);

        switch (rawNode.type) {
            case "comment":
                // Comments don't insert hardlines themselves; they depend on appropriate
                // hardlines being inserted here.

                // This comment printer inserts hardlines after comments, so do not insert
                // a hardline before a comment if there is a comment right before.
                if (
                    !rawNode.sameline &&
                    previousNode &&
                    !match.comment(previousNode) &&
                    !match.parbreak(previousNode)
                ) {
                    ret.push(hardline);
                }
                ret.push(printedNode);
                if (nextNode && !rawNode.suffixParbreak) {
                    ret.push(hardline);
                }
                break;
            case "environment":
            case "displaymath":
            case "mathenv":
                // Environments always start on a new line (unless they are the first
                // item). Peek to see if there is a newline inserted already.
                if (previousNode && previousNode?.type !== "parbreak") {
                    if (ret[ret.length - 1] === line) {
                        // A preceding `line` should be converted into a `hardline`.
                        // Remove the line so a hardline can be added
                        ret.pop();
                    }
                    if (ret[ret.length - 1] !== hardline) {
                        ret.push(hardline);
                    }
                }
                ret.push(printedNode);
                // If an environment is followed by whitespace, replace it with a hardline
                // instead
                if (nextNode?.type === "whitespace") {
                    ret.push(hardline);
                    i++;
                }

                break;
            case "macro":
                if (renderInfo.breakBefore || renderInfo.breakAround) {
                    // Commands like \section{} should always be preceded by a hardline
                    if (previousNode) {
                        if (
                            ret[ret.length - 1] === line ||
                            ret[ret.length - 1] === hardline
                        ) {
                            // We may be replacing a hardline here for no reason. However,
                            // if there is already a hardline, we don't want to continue
                            // and accidentally add too many linebreaks
                            ret.pop();
                            ret.push(hardline);
                        } else if (
                            !match.comment(previousNode) &&
                            !match.parbreak(previousNode)
                        ) {
                            ret.push(hardline);
                        }
                    }
                }
                // Macros marked as `inParMode` should be unwrapped
                // unless they have a hanging indent, in which case the macro
                // has already be wrapped in an `indent` block
                if (
                    renderInfo.inParMode &&
                    !renderInfo.hangingIndent &&
                    renderCache
                ) {
                    ret.push(
                        (renderCache as any).content,
                        ...((renderCache as any).rawArgs || [])
                    );
                } else {
                    ret.push(printedNode);
                }
                if (renderInfo.breakAfter || renderInfo.breakAround) {
                    // Commands like \section{} should always be followed by a hardline
                    if (nextNode) {
                        if (match.whitespace(nextNode)) {
                            ret.push(hardline);
                            i++;
                        } else if (match.parbreak(nextNode)) {
                            // If the next node is a parbreak, it will insert its own newline
                        } else if (!match.comment(nextNode)) {
                            ret.push(hardline);
                        }
                    }
                }
                break;
            case "parbreak":
                ret.push(hardline, hardline);
                break;
            default:
                ret.push(printedNode);
                break;
        }
    }

    return ret;
}
