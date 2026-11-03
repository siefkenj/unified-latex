import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * List all props of the current node that should be processed
 * in math mode or not in math mode. Except for the arguments of environments, which are
 * never in math mode, if math mode is not specified in the node's render info, empty lists
 * are returned.
 *
 * For example `\text{foo}` will report that `args` should *not* be processed in math mode,
 * since it's contents should always be processed in text mode.
 */
export function listMathChildren(node: Ast.Ast): {
    enter: string[];
    leave: string[];
} {
    const NULL_RETURN = { enter: [], leave: [] };
    if (Array.isArray(node)) {
        return NULL_RETURN;
    }
    if (match.math(node)) {
        // When we enter a math environment, our content is always
        // considered math mode
        return { enter: ["content"], leave: [] };
    }

    const renderInfo: { inMathMode?: boolean } = node._renderInfo || {};
    if (match.anyEnvironment(node)) {
        // The arguments of an environment (e.g. the column specification of `array`)
        // are never in math mode, even when the environment is
        if (node.type === "mathenv" || renderInfo.inMathMode === true) {
            return { enter: ["content"], leave: ["args"] };
        } else if (renderInfo.inMathMode === false) {
            return { enter: [], leave: ["content", "args"] };
        }
        return { enter: [], leave: ["args"] };
    }

    if (renderInfo.inMathMode == null) {
        return NULL_RETURN;
    }
    if (match.macro(node)) {
        if (renderInfo.inMathMode === true) {
            return { enter: ["args"], leave: [] };
        } else if (renderInfo.inMathMode === false) {
            return { enter: [], leave: ["args"] };
        }
    }
    if (node.type === "argument") {
        // Arguments that have their own mode (e.g. the color in `\textcolor{blue}{...}`)
        if (renderInfo.inMathMode === true) {
            return { enter: ["content"], leave: [] };
        } else if (renderInfo.inMathMode === false) {
            return { enter: [], leave: ["content"] };
        }
    }
    return NULL_RETURN;
}
