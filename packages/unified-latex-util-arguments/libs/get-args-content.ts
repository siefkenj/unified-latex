import * as Ast from "@unified-latex/unified-latex-types";

/**
 * Returns the content of `args` for a macro or environment as an array. If an argument
 * was omitted (e.g., because it was an optional arg that wasn't included), then `null` is returned.
 */
export function getArgsContent(
    node: Ast.Macro | Ast.Environment
): (Ast.Node[] | null)[] {
    if (!Array.isArray(node.args)) {
        return [];
    }

    return node.args.map((arg) => {
        if (arg.openMark === "" && arg.content.length === 0) {
            return null;
        }
        return arg.content;
    });
}
