import * as Ast from "@unified-latex/unified-latex-types";

type Position = { line: number; column: number; offset: number };

/**
 * Find the smallest `position` object that contains all `nodes`.
 */
export function enclosingPosition(nodes: Ast.Node[]): {
    start: Position;
    end: Position;
} {
    let start: Position = { line: 1, column: 1, offset: 0 };
    let end: Position = { line: 1, column: 1, offset: 0 };

    for (const node of nodes) {
        if (Number(node.position?.start.offset) < Number(start.offset)) {
            start = node.position?.start as Position;
        }
        if (Number(node.position?.end.offset) > Number(end.offset)) {
            end = node.position?.end as Position;
        }
    }

    return { start, end };
}
