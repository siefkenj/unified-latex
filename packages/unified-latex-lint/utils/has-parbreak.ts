import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";

/**
 * Returns whether there is a parbreak in `nodes` (either a parsed parbreak,
 * or the macro `\par`)
 */
export function hasParbreak(nodes: Ast.Node[]) {
    return nodes.some(
        (node) => match.parbreak(node) || match.macro(node, "par")
    );
}
