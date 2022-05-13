import * as Ast from "../../../unified-latex-types";
import { match } from "../../../unified-latex-util-match";

/**
 * Returns the first non-whitespace/non-comment node in `nodes`. If there is no such
 * node, `null` is returned.
 */
export function firstSignificantNode(nodes: Ast.Node[]): Ast.Node | null {
    let firstNode: Ast.Node | null = null;
    for (const node of nodes) {
        if (match.whitespace(node) || match.comment(node)) {
            continue;
        }
        firstNode = node;
        break;
    }

    return firstNode;
}
