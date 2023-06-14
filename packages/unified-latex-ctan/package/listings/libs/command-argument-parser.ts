import { arg, s } from "@unified-latex/unified-latex-builder";
import { ArgumentParser } from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { gobbleSingleArgument } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";

export const commandArgumentParser: ArgumentParser = (nodes, startPos) => {
    let pos = startPos;
    let nodesRemoved = 0;

    const {
        argument: _optionalArgument,
        nodesRemoved: optionalArgumentNodesRemoved,
    } = gobbleSingleArgument(nodes, parseArgspec("o")[0], pos);
    nodesRemoved += optionalArgumentNodesRemoved;
    const optionalArg = _optionalArgument || arg([], { openMark: "", closeMark: "" });

    const nextArgNode = nodes[pos];
    if (match.group(nextArgNode)) {
        // \lstinline{some_code$}

        const codeArg = arg(nextArgNode.content);
        nodesRemoved += 1;
        nodes.splice(pos, 1);

        return {
            args: [ optionalArg, codeArg ],
            nodesRemoved,
        };
    } else if (match.string(nextArgNode) && nextArgNode.content.length === 1) {
        // \\lstinline#some_code$#
        const brace = nextArgNode.content
        const closePos = nodes.findIndex( (node, i) => i > pos && match.string(node, brace) );
        if (closePos > pos) {
            const codeArg = arg(nodes.slice(pos + 1, closePos), { openMark: brace, closeMark: brace });
            nodesRemoved += closePos - pos + 1;
            nodes.splice(pos, closePos - pos + 1);

            return {
                args: [ optionalArg, codeArg ],
                nodesRemoved,
            };
        }
    }

    // \\lstinline[language]#some_code$
    nodes.splice(pos, 0, s("["), ...optionalArg.content, s("]"))
    console.debug(nodes)
    return { args: [], nodesRemoved: 0 };
};