import { arg } from "../../../../unified-latex-builder";
import * as Ast from "../../../../unified-latex-types";

/**
 * Create a `\textcolor` macro. Color arguments are taken from `origMacro`.
 */
export function colorToTextcolorMacro(
    content: Ast.Node | Ast.Node[],
    origMacro: Ast.Macro
): Ast.Macro {
    if (!Array.isArray(content)) {
        content = [content];
    }
    // Signature of \color is "o m".
    // We want to carry through the same arguments
    const args = (
        origMacro.args
            ? origMacro.args
            : [arg([], { closeMark: "", openMark: "" }), arg([])]
    ).concat(arg(content));

    return {
        type: "macro",
        content: "textcolor",
        args,
        _renderInfo: { inParMode: true },
    };
}