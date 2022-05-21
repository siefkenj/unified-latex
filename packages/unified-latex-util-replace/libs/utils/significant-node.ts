import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Returns the first non-whitespace/non-comment node in `nodes`. If there is no such
 * node, `null` is returned.
 */
export function firstSignificantNode(
    nodes: Ast.Node[],
    parbreaksAreInsignificant?: boolean
): Ast.Node | null {
    const index = firstSignificantNodeIndex(nodes, parbreaksAreInsignificant);
    if (index == null) {
        return null;
    }
    return nodes[index];
}

/**
 * Returns the last non-whitespace/non-comment node in `nodes`. If there is no such
 * node, `null` is returned.
 */
export function lastSignificantNode(
    nodes: Ast.Node[],
    parbreaksAreInsignificant?: boolean
): Ast.Node | null {
    const index = lastSignificantNodeIndex(nodes, parbreaksAreInsignificant);
    if (index == null) {
        return null;
    }
    return nodes[index];
}

/**
 * Returns the index of the last non-whitespace/non-comment node in `nodes`. If there is no such
 * node, `null` is returned.
 */
export function lastSignificantNodeIndex(
    nodes: Ast.Node[],
    parbreaksAreInsignificant?: boolean
): number | undefined {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (
            match.whitespace(node) ||
            match.comment(node) ||
            (parbreaksAreInsignificant && match.parbreak(node))
        ) {
            continue;
        }
        return i;
    }
    return undefined;
}

/**
 * Returns the index of the first non-whitespace/non-comment node in `nodes`. If there is no such
 * node, `null` is returned.
 */
export function firstSignificantNodeIndex(
    nodes: Ast.Node[],
    parbreaksAreInsignificant?: boolean
): number | undefined {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (
            match.whitespace(node) ||
            match.comment(node) ||
            (parbreaksAreInsignificant && match.parbreak(node))
        ) {
            continue;
        }
        return i;
    }
    return undefined;
}
