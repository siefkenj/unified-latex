import { arg } from "@unified-latex/unified-latex-builder";
import { Argument, ArgumentParser } from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { gobbleSingleArgument } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

const argSpecM = parseArgspec("m")[0];

/**
 * This argument parser parses the arguments of the TeX primitives `\hbox`, `\vbox` and `\vtop`,
 * which are in the form of
 * - [to ⟨dimen⟩]{⟨content⟩}
 * - [spread ⟨dimen⟩]{⟨content⟩}
 *
 * The box specification (e.g. ` to 1in`) is returned as the first argument, with empty
 * open and close marks, and the content as the second.
 */
export const boxArgumentParser: ArgumentParser = (nodes, startPos) => {
    let pos = startPos;
    while (
        pos < nodes.length &&
        (match.whitespace(nodes[pos]) ||
            match.comment(nodes[pos]) ||
            match.anyString(nodes[pos]) ||
            match.anyMacro(nodes[pos]))
    ) {
        pos++;
    }
    const specNodes = nodes.slice(startPos, pos);
    // The keyword must not be the start of a longer word (e.g. `\hbox toward{...}`)
    const hasSpec = /^\s*(to|spread)(?!\p{L})/u.test(printRaw(specNodes));
    // The content is only taken as an argument if it immediately follows (or follows
    // the box specification), so that the box isn't given some other content
    if (
        !match.group(nodes[pos]) ||
        !(
            hasSpec ||
            specNodes.every(
                (node) => match.whitespace(node) || match.comment(node)
            )
        )
    ) {
        return { args: [arg(null), arg(null)], nodesRemoved: 0 };
    }

    let specArg: Argument = arg(null);
    let nodesRemoved = 0;
    if (hasSpec) {
        specArg = arg(specNodes, { openMark: "", closeMark: "" });
        nodes.splice(startPos, specNodes.length);
        nodesRemoved += specNodes.length;
    }
    const { argument: contentArg, nodesRemoved: contentNodesRemoved } =
        gobbleSingleArgument(nodes, argSpecM, startPos);
    nodesRemoved += contentNodesRemoved;

    return {
        args: [specArg, contentArg || arg(null)],
        nodesRemoved,
    };
};
