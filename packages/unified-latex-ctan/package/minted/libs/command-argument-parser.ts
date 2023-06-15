import {
    getDelimGroup,
    getGroup,
    getOptionalArg,
} from "@unified-latex/unified-latex-ctan/utils/argument-globber";
import { ArgumentParser } from "@unified-latex/unified-latex-types";

/**
 * This argument parser parses arguments in the form of
 * - [⟨options⟩]{⟨language⟩}⟨delim⟩⟨code⟩⟨delim⟩
 * - [⟨options⟩]{⟨language⟩}{⟨code⟩}
 */
export const omdArgumentParser: ArgumentParser = (nodes, startPos) => {
    const optionalArg = getOptionalArg(nodes, startPos);
    const languageArg = getGroup(nodes, startPos);
    let codeArg = getGroup(nodes, startPos);
    if (codeArg.nodesRemoved === 0) {
        codeArg = getDelimGroup(nodes, startPos);
    }

    return {
        args: [optionalArg.arg, languageArg.arg, codeArg.arg],
        nodesRemoved:
            optionalArg.nodesRemoved +
            languageArg.nodesRemoved +
            codeArg.nodesRemoved,
    };
};
