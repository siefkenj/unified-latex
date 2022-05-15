import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { createMacroExpander } from "./newcommand";

/**
 * Expands macros in `ast` as specified by `macros`.
 * Each macro in `macros` should provide the substitution AST (i.e., the AST with the #1, etc.
 * in it). This function assumes that the appropriate arguments have already been attached
 * to each macro specified. If the macro doesn't have it's arguments attached, its
 * contents will be wholesale replaced with its substitution AST.
 */
export function expandMacros(
    tree: Ast.Ast,
    macros: { name: string; substitution: Ast.Node[] }[]
) {
    const expanderCache = new Map(
        macros.map((spec) => [
            spec.name,
            createMacroExpander(spec.substitution),
        ])
    );
    replaceNode(tree, (node) => {
        if (!match.anyMacro(node)) {
            return;
        }
        const macroName = node.content;
        const expander = expanderCache.get(macroName);
        if (!expander) {
            return;
        }

        return expander(node);
    });
}
