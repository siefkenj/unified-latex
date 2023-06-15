import { arg } from "@unified-latex/unified-latex-builder";
import { Argument, ArgumentParser } from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { gobbleSingleArgument } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * This argument parser parses arguments in the form of
 * - [⟨options⟩]{⟨language⟩}⟨delim⟩⟨code⟩⟨delim⟩
 * - [⟨options⟩]{⟨language⟩}{⟨code⟩}
 */
export const argumentParser: ArgumentParser = (nodes, startPos) => {
    const { argument: optionalArg, nodesRemoved: optionalArgNodesRemoved } =
        gobbleSingleArgument(nodes, parseArgspec("o")[0], startPos);

    const { argument: languageArg, nodesRemoved: languageArgNodesRemoved } =
        gobbleSingleArgument(nodes, parseArgspec("m")[0], startPos);

    let codeArg: Argument | null = null;
    let codeArgNodesRemoved: number = 0;
    const nextNode = nodes[startPos];
    if (match.group(nextNode)) {
        const mandatoryArg = gobbleSingleArgument(
            nodes,
            parseArgspec("m")[0],
            startPos
        );
        codeArg = mandatoryArg.argument;
        codeArgNodesRemoved = mandatoryArg.nodesRemoved;
    } else if (match.string(nextNode) && nextNode.content.length === 1) {
        const delim = nextNode.content;
        const delimArg = gobbleSingleArgument(
            nodes,
            parseArgspec(`r${delim}${delim}`)[0],
            startPos
        );
        codeArg = delimArg.argument;
        codeArgNodesRemoved = delimArg.nodesRemoved;
    }

    return {
        args: [optionalArg || arg(null), languageArg || arg(null), codeArg || arg(null)],
        nodesRemoved: optionalArgNodesRemoved + languageArgNodesRemoved + codeArgNodesRemoved,
    };
};
