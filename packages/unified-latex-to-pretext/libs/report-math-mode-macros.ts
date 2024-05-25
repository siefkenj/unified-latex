import * as Ast from "@unified-latex/unified-latex-types";
import {createMacroExpander, expandMacros } from "@unified-latex/unified-latex-util-macros"
import { anyMacro } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import KATEX_SUPPORT_LIST from "./katex-support.json"

// return list of unsupported macros?
export function parse_macros(ast: Ast.Ast): string[] {
    let unsupported: string[];

    // visit all nodes
    visit(ast, (node, info) => {
        // macro in math mode (need both?)
        if (anyMacro(node) && (info.context.hasMathModeAncestor || info.context.inMathMode)) {
            // check if user-defined
            // *see if there are more user-defined commands
            if (node.content === "newcommand" || node.content === "renewcommand") {
                return; // For now
            }

            // check if supported from katex

        }
    });
}

// might not need this depending on macros package capabilities
export function expand_user_macros(node: Ast.Macro): {

}

