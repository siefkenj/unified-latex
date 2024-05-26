import * as Ast from "@unified-latex/unified-latex-types";
import { newcommandMacroToSubstitutionAst } from "@unified-latex/unified-latex-util-macros/libs/newcommand";
import { newcommandMatcher } from "@unified-latex/unified-latex-util-macros/libs/list-newcommands"
import { anyMacro, match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { katexSpecificMacroReplacements } from "./pre-conversion-subs/katex-subs";

// return list of unsupported macros
export function report_macros(ast: Ast.Ast): string[] {
    let unsupported: string[] = [];

    // match a macro supported by Katex
    const isKatexMacro = match.createMacroMatcher(katexSpecificMacroReplacements);

    // visit all nodes
    visit(ast, (node, info) => {
        // macro in math mode
        if (anyMacro(node) && info.context.hasMathModeAncestor) {
            const macro_name = node.content;

            // check if not supported by katex
            if (!isKatexMacro(node)) {
                unsupported.push(macro_name);
            }
        }
    });

    return unsupported;
}

export function expand_user_macros(node: Ast.Macro): Ast.Node[] {
    return newcommandMacroToSubstitutionAst(node);
}

