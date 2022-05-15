import * as Ast from "@unified-latex/unified-latex-types";

/**
 * Split a list of nodes based on whether `splitFunc` returns `true`.
 * If `onlySplitOnFirstOccurrence` is set to true in the `options` object, then
 * there will be at most two segments returned.
 */
export function splitOnCondition(
    nodes: Ast.Node[],
    splitFunc: (node: Ast.Node) => boolean = () => false,
    options?: { onlySplitOnFirstOccurrence?: boolean }
): { segments: Ast.Node[][]; separators: Ast.Node[] } {
    if (!Array.isArray(nodes)) {
        throw new Error(`Can only split an Array, not ${nodes}`);
    }

    const { onlySplitOnFirstOccurrence = false } = options || {};

    const splitIndices: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (splitFunc(nodes[i])) {
            splitIndices.push(i);
            if (onlySplitOnFirstOccurrence) {
                break;
            }
        }
    }

    // Short circuit if there is no splitting to be done
    if (splitIndices.length === 0) {
        return { segments: [nodes], separators: [] };
    }

    let separators = splitIndices.map((i) => nodes[i]);
    let segments = splitIndices.map((splitEnd, i) => {
        const splitStart = i === 0 ? 0 : splitIndices[i - 1] + 1;
        return nodes.slice(splitStart, splitEnd);
    });
    segments.push(
        nodes.slice(splitIndices[splitIndices.length - 1] + 1, nodes.length)
    );

    return { segments, separators };
}
