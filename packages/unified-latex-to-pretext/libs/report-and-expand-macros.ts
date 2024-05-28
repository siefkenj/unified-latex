import * as Ast from "@unified-latex/unified-latex-types";
import { newcommandMatcher,listNewcommands, newcommandMacroToSubstitutionAst, expandMacrosExcludingDefinitions, expandMacros } from "@unified-latex/unified-latex-util-macros";
import { anyMacro, match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { attachNeededRenderInfo, katexSpecificMacroReplacements, KATEX_SUPPORT } from "./pre-conversion-subs/katex-subs";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";

/**
 * Return list of macros unsupported by Katex
 */
export function report_macros(ast: Ast.Ast): string[] {
    let unsupported: string[] = [];
    //attachNeededRenderInfo(ast);

    // match a macro supported by Katex
    // const isKatexMacro = match.createMacroMatcher(katexSpecificMacroReplacements);

    // visit all nodes
    visit(ast, (node, info) => {
        // macro in math mode
        if (anyMacro(node) && info.context.hasMathModeAncestor) {
            const macro_name = node.content;
            //console.log(node);
            //console.log(katexSpecificMacroReplacements[node.content]);

            // check if not supported by katex
            // if (!isKatexMacro(node)) {
            if (!KATEX_SUPPORT.macros.includes(macro_name)) {
                unsupported.push(macro_name);
            }
        }
    });

    return unsupported;
}

/**
 * Expands user-defined macros
 */
export function expand_user_macros(ast: Ast.Ast): void  {
    replaceNode(ast, (node) => {
        if (anyMacro(node) && newcommandMatcher(node)) {
            return newcommandMacroToSubstitutionAst(node);
        }
    });
}

