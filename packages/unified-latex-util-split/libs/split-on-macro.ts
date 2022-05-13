import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import { splitOnCondition } from "./split-on-condition";

/**
 * Split an array of AST nodes based on a macro. An object `{segments: [], macros: []}`
 * is returned. The original array is reconstructed as
 * `segments[0] + macros[0] + segments[1] + ...`.
 *
 * @param {[object]} ast
 * @param {(string|[string])} macroName
 * @returns {{segments: [object], macros: [object]}}
 */
export function splitOnMacro(
    ast: Ast.Node[],
    macroName: string | string[]
): { segments: Ast.Node[][]; macros: Ast.Macro[] } {
    if (typeof macroName === "string") {
        macroName = [macroName];
    }
    if (!Array.isArray(macroName)) {
        throw new Error("Type coercion failed");
    }
    const isSeparator = match.createMacroMatcher(macroName);
    const { segments, separators } = splitOnCondition(ast, isSeparator);
    return { segments, macros: separators as Ast.Macro[] };
}
