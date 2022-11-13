import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { newcommandMatcher } from "./list-newcommands";
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
    macros: { name: string; body: Ast.Node[] }[]
) {
    const expanderCache = new Map(
        macros.map((spec) => [spec.name, createMacroExpander(spec.body)])
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

/**
 * Expands macros in `ast` as specified by `macros`, but do not expand any macros
 * that appear in the context of a macro definition. For example, expanding `\foo` to `X` in
 * ```
 * \newcommand{\foo}{Y}
 * \foo
 * ```
 * would result in
 * ```
 * \newcommand{\foo}{Y}
 * X
 * ```
 * If `expandMacros(...)` were used, macros would be expanded in all contexts and the result
 * would be
 * ```
 * \newcommand{X}{Y}
 * X
 * ```
 *
 * Each macro in `macros` should provide the substitution AST (i.e., the AST with the #1, etc.
 * in it). This function assumes that the appropriate arguments have already been attached
 * to each macro specified. If the macro doesn't have it's arguments attached, its
 * contents will be wholesale replaced with its substitution AST.
 */
export function expandMacrosExcludingDefinitions(
    tree: Ast.Ast,
    macros: { name: string; body: Ast.Node[] }[]
) {
    const expanderCache = new Map(
        macros.map((spec) => [spec.name, createMacroExpander(spec.body)])
    );
    replaceNode(tree, (node, info) => {
        if (!match.anyMacro(node)) {
            return;
        }
        const macroName = node.content;
        const expander = expanderCache.get(macroName);
        if (!expander) {
            return;
        }

        // We don't want to substitute if we are a child of a newcommand
        if (info.parents.some((n) => newcommandMatcher(n))) {
            return;
        }

        return expander(node);
    });
}
