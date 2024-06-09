import * as Ast from "@unified-latex/unified-latex-types";
import {
    expandMacrosExcludingDefinitions,
    listNewcommands,
} from "@unified-latex/unified-latex-util-macros";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import { anyMacro } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";

type NewCommandSpec = ReturnType<typeof listNewcommands>[number];

/**
 * Expands user-defined macros
 */
export function expandUserDefinedMacros(ast: Ast.Ast): void {
    const newcommands = listNewcommands(ast);

    // get a set of all macros to be expanded
    const macrosToExpand = new Set(newcommands.map((command) => command.name));

    const macroInfo = Object.fromEntries(
        newcommands.map((m) => [m.name, { signature: m.signature }])
    );

    // recursively expand at most 100 times
    for (let i = 0; i < 100; i++) {
        // check if any macros still need expanding
        if (!needToExpand(ast, macrosToExpand)) {
            break;
        }

        // attach the arguments to each macro before processing it
        attachMacroArgs(ast, macroInfo);
        expandMacrosExcludingDefinitions(ast, newcommands);
    }
}

function needToExpand(ast: Ast.Ast, macros: Set<string>): boolean {
    let needExpand = false;

    visit(ast, (node) => {
        if (anyMacro(node) && macros.has(node.content)) {
            needExpand = true;
            EXIT;
        }
    });

    return needExpand;
}
