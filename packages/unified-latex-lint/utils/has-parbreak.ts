import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Returns whether there is a parbreak in `nodes` (either a parsed parbreak,
 * or the macro `\par`)
 */
export function hasParbreak(nodes: Ast.Node[]) {
    return nodes.some(
        (node) => match.parbreak(node) || match.macro(node, "par")
    );
}

/**
 * Is there a parbreak or a macro/environment that acts like a parbreak (e.g. \section{...})
 * in the array?
 */
export function hasBreakingNode(
    nodes: Ast.Node[],
    options?: {
        macrosThatBreakPars?: string[];
        environmentsThatDontBreakPars?: string[];
    }
): boolean {
    if (hasParbreak(nodes)) {
        return true;
    }

    const {
        macrosThatBreakPars = [
            "part",
            "chapter",
            "section",
            "subsection",
            "subsubsection",
            "vspace",
            "smallskip",
            "medskip",
            "bigskip",
            "hfill",
        ],
        environmentsThatDontBreakPars = [],
    } = options || {};

    const macroMatcher = match.createMacroMatcher(macrosThatBreakPars);
    const envMatcher = match.createEnvironmentMatcher(
        environmentsThatDontBreakPars
    );

    return nodes.some(
        (node) =>
            macroMatcher(node) ||
            (match.anyEnvironment(node) && !envMatcher(node))
    );
}
