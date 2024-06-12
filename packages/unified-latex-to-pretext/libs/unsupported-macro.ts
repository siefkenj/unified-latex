import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { macro, match } from "@unified-latex/unified-latex-util-match";
import { KATEX_SUPPORT } from "@unified-latex/unified-latex-to-pretext/libs/pre-conversion-subs/katex-subs";

//This function returns the list of unsupported macros from the Katex_support document
//by tranversing the nodes then determine if they match the type as well as the node content

export function returnUnsupportedMacro(ast: Ast.Ast): String[] {
    const unsupported: string[] = [];
    const matched = match.createMacroMatcher(KATEX_SUPPORT.macros);

    visit(ast, (node) => {
        if (macro(node)) {
            const macroName = node.content;
            if (!matched(node)) {
                unsupported.push(macroName);
            }
        }
    });

    return unsupported;
}
