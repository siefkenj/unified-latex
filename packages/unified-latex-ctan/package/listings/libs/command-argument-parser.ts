import { s } from "@unified-latex/unified-latex-builder";
import { getDelimGroup, getGroup, getOptionalArg } from "@unified-latex/unified-latex-ctan/utils/argument-globber";
import { ArgumentParser } from "@unified-latex/unified-latex-types";


/**
 * This argument parser parses arguments in the form of
 * - [⟨key=value list⟩]⟨character⟩⟨source code⟩⟨same character⟩
 * - [⟨key=value list⟩]{⟨source code⟩}
 */
export const odArgumentParser: ArgumentParser = (nodes, startPos) => {
    let pos = startPos;
    let nodesRemoved = 0;

    const optionalArg = getOptionalArg(nodes, pos);
    nodesRemoved += optionalArg.nodesRemoved;

    const codeArg = getGroup(nodes, pos) || getDelimGroup(nodes, pos);
    if (codeArg) {
        return {
            args: [optionalArg.arg, codeArg.arg],
            nodesRemoved: optionalArg.nodesRemoved + codeArg.nodesRemoved
        }
    } else {
        // \\lstinline[language]#some_code$
        // This case, the optional arguments should not be globbed. Return them.
        nodes.splice(pos, 0, s("["), ...optionalArg.arg.content, s("]"))
        return { args: [], nodesRemoved: 0 };
    }
};

/**
 * This argument parser parses arguments in the form of
 * - [⟨key=value list⟩]{⟨file name⟩}
 */
export const ovArgumentParser: ArgumentParser = (nodes, startPos) => {
    let pos = startPos;
    let nodesRemoved = 0;

    const optionalArg = getOptionalArg(nodes, pos);
    nodesRemoved += optionalArg.nodesRemoved;

    const fileArg = getGroup(nodes, pos)
    if (fileArg) {
        return {
            args: [optionalArg.arg, fileArg.arg],
            nodesRemoved: optionalArg.nodesRemoved + fileArg.nodesRemoved
        }
    } else {
        // \\lstinputlisting[language]
        // This case, the optional arguments should not be globbed. Return them.
        nodes.splice(pos, 0, s("["), ...optionalArg.arg.content, s("]"))
        return { args: [], nodesRemoved: 0 };
    }
};