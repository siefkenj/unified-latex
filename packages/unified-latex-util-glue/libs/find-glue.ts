import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { parseTexGlue } from "./parse";
import { printGlue } from "./print-glue";

/**
 * Finds patterns matching TeX glue in `nodes`. A pretty-formatted version
 * of the glue is returned along with information about how many nodes were consumed.
 *
 * The return object consists of
 *   * `printedGlue` - the pretty-printed version of the glue
 *   * `endIndex` - the index in `nodes` where the glue string terminates
 *   * `partialSliceLen` - how far into the `Ast.String` node the glue string finished. For example `1ptXX` would parse as `1pt`, and the parsing would terminate partway through the string node.
 */
export function findGlue(
    nodes: (Ast.Node | Ast.Argument)[],
    startIndex: number
): {
    printedGlue: Ast.Node[];
    endIndex: number;
    partialSliceLen: number;
} | null {
    let searchString = "";
    const sourceIndices: number[] = [];
    // We create a string until we run into a token that cannot be used
    // in a length definition. We keep track of the "source indices" for every
    // character in our string.
    for (let i = startIndex; i < nodes.length; i++) {
        const node = nodes[i];
        if (match.whitespace(node) || match.comment(node)) {
            continue;
        }
        if (!match.anyString(node)) {
            break;
        }
        searchString += node.content;
        // Keep track of the corresponding source indices
        node.content.split("").forEach(() => sourceIndices.push(i));
    }

    // Now we look for the glue
    const glue = parseTexGlue(searchString);
    if (!glue) {
        return null;
    }
    const printedGlue = printGlue(glue);
    const glueLen = glue.position.end.offset;
    // The glue could have ended partway through a string node. If so
    // we want to compute how far in we've sliced
    const firstInstanceOfNodeIndex = sourceIndices.indexOf(
        sourceIndices[glueLen]
    );
    return {
        printedGlue,
        endIndex: sourceIndices[glueLen - 1],
        partialSliceLen: glueLen - firstInstanceOfNodeIndex,
    };
}

/**
 * Extract glue from a list of nodes returning a node array with
 * properly formatted glue as well as start/end indices where the glue was
 * "sliced out" of `nodes`.
 *
 * Sometimes glue may end in the middle of a string node. If this happens, the
 * string node is split and the second half is returned in the `trailingStrings` array.
 */
export function extractFormattedGlue(
    nodes: (Ast.Node | Ast.Argument)[],
    startIndex: number
): {
    glue: Ast.Node[];
    span: { start: number; end: number };
    trailingStrings: Ast.String[];
} | null {
    const glue = findGlue(nodes, startIndex);
    if (!glue) {
        return null;
    }
    let trailingStrings: Ast.String[] = [];
    const retNodes = glue.printedGlue;
    // We might have split the last string node while searching for the glue. If so
    // we need to create a new string node that contains the remaining information.
    const lastString = nodes[glue.endIndex];
    if (lastString.type !== "string") {
        throw new Error(`Expect string node, but found "${lastString.type}"`);
    }
    if (lastString.content.length > glue.partialSliceLen) {
        trailingStrings.push({
            type: "string",
            content: lastString.content.slice(glue.partialSliceLen),
        });
    }
    return {
        glue: retNodes,
        span: { start: startIndex, end: glue.endIndex },
        trailingStrings,
    };
}
