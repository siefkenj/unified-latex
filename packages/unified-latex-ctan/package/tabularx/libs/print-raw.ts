import * as TabularSpec from "./types";
import { printRaw as latexPrintRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * Print a tabular/tabularx argument specification AST to a string.
 */
export function printRaw(node: TabularSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    switch (node.type) {
        case "vert_divider":
            return "|";
        case "at_divider":
            return `@{${latexPrintRaw(node.content)}}`;
        case "bang_divider":
            return `!{${latexPrintRaw(node.content)}}`;
        case "alignment":
            if (node.alignment === "left") {
                return "l";
            }
            if (node.alignment === "right") {
                return "r";
            }
            if (node.alignment === "center") {
                return "c";
            }
            if (node.alignment === "X") {
                return "X";
            }
            if (node.alignment === "parbox") {
                if (node.baseline === "top") {
                    return `p{${latexPrintRaw(node.size)}}`;
                }
                if (node.baseline === "default") {
                    return `m{${latexPrintRaw(node.size)}}`;
                }
                if (node.baseline === "bottom") {
                    return `b{${latexPrintRaw(node.size)}}`;
                }
                return `w{${latexPrintRaw(node.baseline)}}{${latexPrintRaw(
                    node.size
                )}}`;
            }
            break;
        case "decl_code":
            return latexPrintRaw(node.code);

        case "column":
            const end_code = node.before_end_code
                ? `<{${printRaw(node.before_end_code)}}`
                : "";
            const start_code = node.before_start_code
                ? `>{${printRaw(node.before_start_code)}}`
                : "";
            return [
                printRaw(node.pre_dividers),
                start_code,
                printRaw(node.alignment),
                end_code,
                printRaw(node.post_dividers),
            ].join("");

        default:
            console.warn(
                `Unknown node type "${(node as any).type}" for node`,
                node
            );
            return "";
    }
    return "";
}
