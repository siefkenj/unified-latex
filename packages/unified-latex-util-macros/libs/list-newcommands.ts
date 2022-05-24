import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import {
    LATEX_NEWCOMMAND,
    newcommandMacroToName,
    newcommandMacroToSpec,
    newcommandMacroToSubstitutionAst,
    XPARSE_NEWCOMMAND,
} from "./newcommand";

type NewCommandSpec = {
    name: string;
    signature: string;
    body: Ast.Node[];
    definition: Ast.Macro;
};

const newcommandMatcher = match.createMacroMatcher([
    ...LATEX_NEWCOMMAND,
    ...XPARSE_NEWCOMMAND,
]);

/**
 * List all new commands defined in `tree`. This lists commands defined LaTeX-style with
 * `\newcommand` etc., and defined with xparse-style `\NewDocumentCommand` etc. It does
 * **not** find commands defined via `\def` (it is too difficult to parse the argument
 * signature of commands defined with `\def`).
 */
export function listNewcommands(tree: Ast.Ast): NewCommandSpec[] {
    const ret: NewCommandSpec[] = [];
    visit(
        tree,
        (node) => {
            const name = newcommandMacroToName(node);
            const signature = newcommandMacroToSpec(node);
            const body = newcommandMacroToSubstitutionAst(node);

            ret.push({ name, signature, body, definition: node });
        },
        { test: newcommandMatcher }
    );
    return ret;
}
