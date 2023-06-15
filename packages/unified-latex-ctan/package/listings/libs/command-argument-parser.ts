import {
    getDelimGroup,
    getGroup,
    getOptionalArg,
} from "@unified-latex/unified-latex-ctan/utils/argument-globber";
import { ArgumentParser } from "@unified-latex/unified-latex-types";

/**
 * This argument parser parses arguments in the form of
 * - [⟨key=value list⟩]⟨character⟩⟨source code⟩⟨same character⟩
 * - [⟨key=value list⟩]{⟨source code⟩}
 */
export const odArgumentParser: ArgumentParser = (nodes, startPos) => {
    const optionalArg = getOptionalArg(nodes, startPos);
    let codeArg = getGroup(nodes, startPos);
    if (codeArg.nodesRemoved === 0) {
        codeArg = getDelimGroup(nodes, startPos);
    }

    return {
        args: [optionalArg.arg, codeArg.arg],
        nodesRemoved: optionalArg.nodesRemoved + codeArg.nodesRemoved,
    };
};

/**
 * This argument parser parses arguments in the form of
 * - [⟨key=value list⟩]{⟨file name⟩}
 */
export const ovArgumentParser: ArgumentParser = (nodes, startPos) => {
    const optionalArg = getOptionalArg(nodes, startPos);
    const fileArg = getGroup(nodes, startPos);
    return {
        args: [optionalArg.arg, fileArg.arg],
        nodesRemoved: optionalArg.nodesRemoved + fileArg.nodesRemoved,
    };
};
