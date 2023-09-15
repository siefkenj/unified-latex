import { arg } from "@unified-latex/unified-latex-builder";
import { Argument, ArgumentParser } from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { Node } from "@unified-latex/unified-latex-util-argspec/libs/argspec-types";
import { gobbleSingleArgument } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";

const argSpecM = parseArgspec("m")[0];
const argSpecO = parseArgspec("o")[0];
const argSpecRDelim: { [delim: string]: Node } = {};

/**
 * This argument parser parses arguments in the form of
 * - [⟨options⟩]{⟨language⟩}⟨delim⟩⟨code⟩⟨delim⟩
 * - [⟨options⟩]{⟨language⟩}{⟨code⟩}
 */
export const argumentParser: ArgumentParser = (nodes, startPos) => {
    const { argument: optionalArg, nodesRemoved: optionalArgNodesRemoved } =
        gobbleSingleArgument(nodes, argSpecO, startPos);

    const { argument: languageArg, nodesRemoved: languageArgNodesRemoved } =
        gobbleSingleArgument(nodes, argSpecM, startPos);

    let codeArg: Argument | Argument[] | null = null;
    let codeArgNodesRemoved: number = 0;
    const nextNode = nodes[startPos];
    if (match.group(nextNode)) {
        const mandatoryArg = gobbleSingleArgument(nodes, argSpecM, startPos);
        codeArg = mandatoryArg.argument;
        codeArgNodesRemoved = mandatoryArg.nodesRemoved;
    } else if (match.string(nextNode) && nextNode.content.length === 1) {
        const delim = nextNode.content;
        argSpecRDelim[delim] =
            argSpecRDelim[delim] || parseArgspec(`r${delim}${delim}`)[0];
        const delimArg = gobbleSingleArgument(
            nodes,
            argSpecRDelim[delim],
            startPos
        );
        codeArg = delimArg.argument;
        codeArgNodesRemoved = delimArg.nodesRemoved;
    }

    return {
        args: [
            optionalArg || arg(null),
            languageArg || arg(null),
            codeArg || arg(null),
        ],
        nodesRemoved:
            optionalArgNodesRemoved +
            languageArgNodesRemoved +
            codeArgNodesRemoved,
    };
};
