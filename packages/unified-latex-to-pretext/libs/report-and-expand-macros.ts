import * as Ast from "@unified-latex/unified-latex-types";
import { newcommandMatcher, newcommandMacroToSubstitutionAst } from "@unified-latex/unified-latex-util-macros";
import { anyMacro, match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { KATEX_SUPPORT } from "./pre-conversion-subs/katex-subs";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";

/**
 * Return list of macros unsupported by Katex
 */
export function report_macros(ast: Ast.Ast): string[] {
    let unsupported: string[] = [];

    // match a macro supported by Katex
    const isSupported = match.createMacroMatcher(KATEX_SUPPORT.macros);

    // visit all nodes
    visit(ast, (node, info) => {
        // macro in math mode
        if (anyMacro(node) && info.context.hasMathModeAncestor) {
            const macro_name = node.content;

            // check if not supported by katex
            if (!isSupported(node)) {
                unsupported.push(macro_name);
            }
        }
    });

    return unsupported;
}

/**
 * Expands user-defined macros
 */
export function expand_user_macros(ast: Ast.Ast): void {
    replaceNode(ast, (node) => {
        if (anyMacro(node) && newcommandMatcher(node)) {
            return newcommandMacroToSubstitutionAst(node);
        }
    });
}

