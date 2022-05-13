import { printRaw as latexPrintRaw } from "../../../../unified-latex-util-print-raw";
import * as SystemeSpec from "./types";

/**
 * Print an `systeme` argument specification AST to a string.
 */
export function printRaw(node: SystemeSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    switch (node.type) {
        case "annotation":
            return `${latexPrintRaw(node.marker)}${latexPrintRaw(
                node.content
            )}`;
        case "item":
            return `${node.op ? latexPrintRaw(node.op) : ""}${latexPrintRaw(
                node.content
            )}`;
        case "equation":
            const left = node.left.map((n) => printRaw(n)).join("");
            const right = latexPrintRaw(node.right);
            const equals = node.equals ? latexPrintRaw(node.equals) : "";
            return `${left}${equals}${right}`;
        case "line":
            const equation = node.equation ? printRaw(node.equation) : "";
            const annotation = node.annotation ? printRaw(node.annotation) : "";
            const sep = node.sep ? latexPrintRaw(node.sep) : "";

            const body = `${equation}${annotation}${sep}`;
            if (node.trailingComment) {
                return latexPrintRaw([body, node.trailingComment]);
            }

            return body;

        default:
            console.warn(
                `Unknown node type "${(node as any).type}" for node`,
                node
            );
            return "";
    }
}
