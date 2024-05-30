import * as Ast from "@unified-latex/unified-latex-types";
import { anyMacro } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    newcommandMatcher,
    newcommandMacroToSubstitutionAst,
} from "@unified-latex/unified-latex-util-macros";

/**
 * Expands user-defined macros
 */
export function ExpandUserDefinedMacros(ast: Ast.Ast): void {
    replaceNode(ast, (node) => {
        if (anyMacro(node) && newcommandMatcher(node)) {
            return newcommandMacroToSubstitutionAst(node);
        }
    });
}
