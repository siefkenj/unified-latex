import { printRaw as latexPrintRaw } from "@unified-latex/unified-latex-util-print-raw";
import { trim } from "@unified-latex/unified-latex-util-trim";
import * as TikzSpec from "./types";

/**
 * Print an `systeme` argument specification AST to a string.
 */
export function printRaw(node: TikzSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        const printed: string[] = [];
        for (let i = 0; i < node.length; i++) {
            const tok = node[i];
            const prevTok = node[i - 1];
            if (!prevTok) {
                printed.push(printRaw(tok));
                continue;
            }
            if (prevTok.type === "comment") {
                printed.push(printRaw(tok));
                continue;
            }
            if (tok.type !== "comment") {
                printed.push(sepToken);
            }
            printed.push(printRaw(tok));
        }
        return printed.join("");
    }
    const type = node.type;

    switch (type) {
        case "path_spec":
            return printRaw(node.content, (root = true));
        case "coordinate":
            return `${latexPrintRaw(node.prefix)}(${latexPrintRaw(
                node.content
            )})`;
        case "operation":
            return latexPrintRaw(node.content);
        case "comment":
            return latexPrintRaw(node);
        case "line_to":
            return node.command;
        case "curve_to": {
            const comments = node.comments
                .map((c) => latexPrintRaw({ ...c, leadingWhitespace: false }))
                .join("");
            if (node.controls.length === 1) {
                return `${comments}.. controls ${printRaw(
                    node.controls[0]
                )} ..`;
            } else {
                return `${comments}.. controls ${printRaw(
                    node.controls[0]
                )} and ${printRaw(node.controls[1])} ..`;
            }
        }
        case "unknown":
            return latexPrintRaw(node.content);
        case "square_brace_group":
            return `[${latexPrintRaw(node.content)}]`;
        case "foreach": {
            const comments = node.comments
                .map((c) => latexPrintRaw({ ...c, leadingWhitespace: false }))
                .join("");
            let options = "";
            if (node.options) {
                options = ` [${latexPrintRaw(node.options)}]`;
            }
            const start = latexPrintRaw(node.start);
            const variables = [...node.variables];
            trim(variables);
            let printedVariables = latexPrintRaw(variables);
            // It is possible that the variables are specified as `[var=\p]`, in the optional argument, instead of as `\p`
            // In this case, `node.variables` will be empty and we don't want an extra space showing up.
            if (printedVariables.length > 0) {
                printedVariables = " " + printedVariables;
            }

            const command =
                node.command.type === "foreach"
                    ? printRaw(node.command)
                    : latexPrintRaw(node.command);

            return `${comments}${start}${printedVariables}${options} in ${latexPrintRaw(
                node.list
            )} ${command}`;
        }
        case "svg_operation": {
            const comments = node.comments
                .map((c) => latexPrintRaw({ ...c, leadingWhitespace: false }))
                .join("");
            let options = "";
            if (node.options) {
                options = `[${latexPrintRaw(node.options)}]`;
            }

            return `${comments}svg${options} ${latexPrintRaw(node.content)}`;
        }
        case "animation": {
            const comments = node.comments
                .map((c) => latexPrintRaw({ ...c, leadingWhitespace: false }))
                .join("");

            return `${comments}:${node.attribute} = {${latexPrintRaw(
                node.content
            )}}`;
        }

        default:
            const unprintedType: void = type;
            console.warn(`Unknown node type "${unprintedType}" for node`, node);
            return "";
    }
}
