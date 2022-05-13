import * as Ast from "../../unified-latex-types";

type Printable = Ast.Node | Ast.Argument | string;
type PrintToken = string | typeof linebreak;

export const linebreak = Symbol("linebreak");
const ESCAPE = "\\";

/**
 * Renders the AST to an array inserting `linebreak` where needed;
 * This array may be nested.
 *
 * @param {*} node
 */
function _printRaw(node: Printable | Printable[]): PrintToken[] {
    if (typeof node === "string") {
        return [node];
    }
    if (Array.isArray(node)) {
        return ([] as PrintToken[]).concat(
            ...node.map((n: Printable) => _printRaw(n))
        );
    }
    // tmp variables
    let argsString, escape;
    switch (node.type) {
        case "root":
            return _printRaw(node.content);
        case "argument":
            return [node.openMark, ..._printRaw(node.content), node.closeMark];
        case "comment":
            var suffix = node.suffixParbreak ? "" : linebreak;
            // A comment is responsible for printing its own leading whitespace
            var leadingWhitespace = "";
            if (node.sameline && node.leadingWhitespace) {
                leadingWhitespace = " ";
            }
            if (node.sameline) {
                return [
                    leadingWhitespace,
                    "%",
                    ..._printRaw(node.content),
                    suffix,
                ];
            }
            return [linebreak, "%", ..._printRaw(node.content), suffix];
        case "environment":
        case "mathenv":
        case "verbatim":
            var env = _printRaw(node.env);
            var envStart: PrintToken[] = [ESCAPE + "begin{", ...env, "}"];
            var envEnd: PrintToken[] = [ESCAPE + "end{", ...env, "}"];
            argsString =
                (node as any).args == null ? [] : _printRaw((node as any).args);
            return [
                ...envStart,
                ...argsString,
                ..._printRaw(node.content),
                ...envEnd,
            ];
        case "displaymath":
            return [ESCAPE + "[", ..._printRaw(node.content), ESCAPE + "]"];
        case "group":
            return ["{", ..._printRaw(node.content), "}"];
        case "inlinemath":
            return ["$", ..._printRaw(node.content), "$"];
        case "macro":
            argsString = node.args == null ? [] : _printRaw(node.args);
            escape = node.escapeToken == null ? ESCAPE : node.escapeToken;
            return [escape, ..._printRaw(node.content), ...argsString];
        case "parbreak":
            return [linebreak, linebreak];
        case "string":
            return [node.content];
        case "verb":
            return [
                ESCAPE,
                node.env,
                node.escape,
                ..._printRaw(node.content),
                node.escape,
            ];
        case "whitespace":
            return [" "];

        default:
            console.warn(
                "Cannot find render for node ",
                node,
                `(of type ${typeof node})`
            );
            return ["" + node];
    }
}

/**
 * Renders the AST to a string without any pretty printing.
 *
 * @param {*} node
 * @param {*} options - Setting `asArray` to `true` will return an array of strings and the symbol `linebreak`, so that printing can be customized.
 */
export function printRaw(
    node: Printable | Printable[],
    options?: { asArray: false }
): string;
export function printRaw(
    node: Printable | Printable[],
    options: { asArray: true }
): PrintToken[];
export function printRaw(node: Printable | Printable[], options?: object): any {
    const asArray = options != null ? (options as any).asArray : false;
    const printedTokens = _printRaw(node);
    if (asArray) {
        return printedTokens;
    }
    return printedTokens.map((x) => (x === linebreak ? "\n" : x)).join("");
}
