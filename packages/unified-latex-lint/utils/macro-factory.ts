import * as Ast from "@unified-latex/unified-latex-types";

/**
 * Factory function that returns a wrapper which wraps the passed in `content`
 * as an arg to a macro named `macroName`.
 *
 * E.g.
 * ```
 * f = singleArgumentMacroFactory("foo");
 *
 * // Gives "\\foo{bar}"
 * printRaw(f("bar"));
 * ```
 */
export function singleArgMacroFactory(
    macroName: string
): (content: Ast.Node | Ast.Node[]) => Ast.Macro {
    return (content: Ast.Node | Ast.Node[]) => {
        if (!Array.isArray(content)) {
            content = [content];
        }
        return {
            type: "macro",
            content: macroName,
            args: [
                {
                    type: "argument",
                    openMark: "{",
                    closeMark: "}",
                    content,
                },
            ],
            _renderInfo: { inParMode: true },
        };
    };
}
