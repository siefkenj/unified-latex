import { arg, m } from "@unified-latex/unified-latex-builder";
import { colorToTextcolorMacro } from "@unified-latex/unified-latex-ctan/package/xcolor";
import * as Ast from "@unified-latex/unified-latex-types";

/**
 * Factory function that generates a macro with bound arguments.
 *
 * e.g.
 * ```
 * factory("foo")("bar") -> `\foo{bar}`
 * ```
 *
 * ```
 * factory("foo", "baz")("bar") -> `\foo{baz}{bar}`
 * ```
 */
function factory(
    macroName: string,
    ...boundArgs: string[]
): (content: Ast.Node[], originalCommand: Ast.Macro) => Ast.Macro {
    return (content, originalCommand) => {
        return m(macroName, boundArgs.map((a) => arg(a)).concat(arg(content)));
    };
}

export const streamingMacroReplacements = {
    color: colorToTextcolorMacro,
    bfseries: factory("textbf"),
    itshape: factory("textit"),
    rmfamily: factory("textrm"),
    scshape: factory("textsc"),
    sffamily: factory("textsf"),
    slshape: factory("textsl"),
    ttfamily: factory("texttt"),
    Huge: factory("textsize", "Huge"),
    huge: factory("textsize", "huge"),
    LARGE: factory("textsize", "LARGE"),
    Large: factory("textsize", "Large"),
    large: factory("textsize", "large"),
    normalsize: factory("textsize", "normalsize"),
    small: factory("textsize", "small"),
    footnotesize: factory("textsize", "footnotesize"),
    scriptsize: factory("textsize", "scriptsize"),
    tiny: factory("textsize", "tiny"),
};
