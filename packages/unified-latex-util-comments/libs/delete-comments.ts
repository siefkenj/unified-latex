import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";

/**
 * Returns a new AST with all comments removed. Care is taken to preserve whitespace.
 * For example
 * ```
 * x%
 * y
 * ```
 * becomes `xy` but
 * ```
 * x %
 * y
 * ```
 * becomes `x y`
 */
export function deleteComments(ast: Ast.Ast) {
    return replaceNode(ast, (node) => {
        if (!match.comment(node)) {
            return;
        }

        if (node.leadingWhitespace) {
            return { type: "whitespace" };
        }

        return null;
    });
}
