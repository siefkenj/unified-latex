import { arg } from "@unified-latex/unified-latex-builder";
import { Argument, Node } from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { gobbleSingleArgument } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";

export function getOptionalArg(nodes: Node[], pos: number): { arg: Argument, nodesRemoved: number } {
    const { argument, nodesRemoved } = gobbleSingleArgument(nodes, parseArgspec("o")[0], pos);
    return {
        arg: argument || arg([], { openMark: "", closeMark: "" }),
        nodesRemoved
    };
}

export function getGroup(nodes: Node[], pos: number): { arg: Argument, nodesRemoved: number } | void {
    const nextArgNode = nodes[pos];
    if (match.group(nextArgNode)) {
        nodes.splice(pos, 1);

        return {
            arg: arg(nextArgNode.content),
            nodesRemoved: 1,
        };
    }
}

export function getDelimGroup(nodes: Node[], pos: number): { arg: Argument, nodesRemoved: number } | void {
    const nextArgNode = nodes[pos];
    if (match.string(nextArgNode) && nextArgNode.content.length === 1) {
        // \\lstinline#some_code$#
        const brace = nextArgNode.content
        const closePos = nodes.findIndex( (node, i) => i > pos && match.string(node, brace) );
        if (closePos > pos) {
            const verbatim = arg(nodes.slice(pos + 1, closePos), { openMark: brace, closeMark: brace });
            const nodesRemoved = closePos - pos + 1;
            nodes.splice(pos, nodesRemoved);

            return {
                arg: verbatim,
                nodesRemoved,
            };
        }
    }
}