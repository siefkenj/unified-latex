import { s } from "@unified-latex/unified-latex-builder";
import { getDelimGroup, getGroup, getOptionalArg } from "@unified-latex/unified-latex-ctan/utils/argument-globber";
import { ArgumentParser } from "@unified-latex/unified-latex-types";


/**
 * This argument parser parses arguments in the form of
 * - [⟨options⟩]{⟨language⟩}⟨delim⟩⟨code⟩⟨delim⟩
 * - [⟨options⟩]{⟨language⟩}{⟨code⟩}
 */
export const omdArgumentParser: ArgumentParser = (nodes, startPos) => {
    let pos = startPos;
    let nodesRemoved = 0;

    const optionalArg = getOptionalArg(nodes, pos);
    nodesRemoved += optionalArg.nodesRemoved;

    const languageArg = getGroup(nodes, pos)

    if (!languageArg) {
        nodes.splice(pos, 0, s("["), ...optionalArg.arg.content, s("]"))
        return { args: [], nodesRemoved: 0 };
    }

    const codeArg = getGroup(nodes, pos) || getDelimGroup(nodes, pos);
    if (codeArg) {
        return {
            args: [optionalArg.arg, languageArg.arg, codeArg.arg],
            nodesRemoved: optionalArg.nodesRemoved + languageArg.nodesRemoved + codeArg.nodesRemoved
        }
    } else {
        nodes.splice(pos, 0, s("{"), ...languageArg.arg.content, s("}"))
        nodes.splice(pos, 0, s("["), ...optionalArg.arg.content, s("]"))
        return { args: [], nodesRemoved: 0 };
    }
};
