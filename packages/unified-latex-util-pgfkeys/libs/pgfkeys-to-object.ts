import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { parsePgfkeys } from "./pgfkeys-parser";

/**
 * Parse `arg` as pgfkeys and return a JavaScript object with the results.
 * The keys will be normalized to strings and the values will be arrays of nodes.
 */
export function pgfkeysArgToObject(
    arg: Ast.Argument | Ast.Node[]
): Record<string, Ast.Node[]> {
    function parseFront(nodes: Ast.Node[]): string {
        return printRaw(nodes);
    }
    function parseBack(nodes: Ast.Node[] | undefined): Ast.Node[] {
        if (!nodes) {
            return [];
        }
        // If the only element is a group, we unwrap it
        if (nodes.length === 1 && match.group(nodes[0])) {
            return nodes[0].content;
        }
        return nodes;
    }

    let nodeList: Ast.Node[];
    if (match.argument(arg)) {
        nodeList = arg.content;
    } else {
        nodeList = arg;
    }
    const parsedArgs = parsePgfkeys(nodeList);
    return Object.fromEntries(
        parsedArgs
            .filter((part) => part.itemParts)
            .map((part) => [
                parseFront(part.itemParts![0]),
                parseBack(part.itemParts![1]),
            ])
    );
}
