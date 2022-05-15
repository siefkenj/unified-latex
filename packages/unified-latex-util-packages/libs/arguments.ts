import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { trim } from "@unified-latex/unified-latex-util-trim";

function stripComments(nodes: Ast.Node[]): Ast.Node[] {
    return nodes.filter((node) => node.type !== "comment");
}

function trimWithReturn(nodes: Ast.Node[]) {
    trim(nodes);
    return nodes;
}

/**
 * Split a list of nodes on a comma
 */
function splitOnComma(nodes: Ast.Node[]): Ast.Node[][] {
    const ret: Ast.Node[][] = [];
    let curr: Ast.Node[] = [];
    for (const node of stripComments(nodes)) {
        if (node.type === "string" && node.content === ",") {
            ret.push(curr);
            curr = [];
        } else {
            curr.push(node);
        }
    }
    if (curr.length > 0) {
        ret.push(curr);
    }

    return ret.map(trimWithReturn);
}

/**
 * Convert a list of nodes to string node, taking care to preserve the start and end
 * position of those nodes.
 */
function nodesToString(nodes: Ast.Node[]): Ast.String {
    if (nodes.length === 0) {
        return { type: "string", content: "" };
    }
    if (nodes.length === 1 && nodes[0].type === "string") {
        return nodes[0];
    }
    // We are going to return a new string, but we wan to preserve
    // the start and end bounds.
    const start = nodes[0].position?.start;
    const end = nodes[nodes.length - 1].position?.end;
    const ret: Ast.String = { type: "string", content: printRaw(nodes) };
    if (start && end) {
        Object.assign(ret, { position: { start, end } });
    }
    return ret;
}

/**
 * Process a list of nodes that should be comma-separated. The result
 * will be a list of `Ast.String` nodes. The start/end position of
 * these nodes is preserved.
 */
export function processCommaSeparatedList(nodes: Ast.Node[]): Ast.String[] {
    return splitOnComma(nodes).map(nodesToString);
}
