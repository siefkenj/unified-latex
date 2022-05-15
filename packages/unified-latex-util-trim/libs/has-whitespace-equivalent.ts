import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Returns whether the array has whitespace at the start/end. Comments with `leadingWhitespace === true`
 * are counted as whitespace. Other comments are ignored.
 */
export function hasWhitespaceEquivalent(nodes: Ast.Node[]): {
    start: boolean;
    end: boolean;
} {
    let start = false;
    let end = false;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (match.comment(node)) {
            // A comment with leading whitespace will render with leading whitespace,
            // so if we encounter one, we should consider ourselves to have leading whitespace.
            if (node.leadingWhitespace) {
                start = true;
                break;
            }
            continue;
        }
        if (match.whitespace(node)) {
            start = true;
        }
        break;
    }
    for (let j = nodes.length - 1; j >= 0; j--) {
        const node = nodes[j];
        if (match.comment(node)) {
            if (node.leadingWhitespace) {
                end = true;
                break;
            }
            continue;
        }
        if (match.whitespace(node)) {
            end = true;
        }
        break;
    }
    return { start, end };
}
