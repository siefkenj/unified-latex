import * as Ast from "@unified-latex/unified-latex-types";
import {
    expandMacrosExcludingDefinitions,
    listNewcommands, newcommandMacroToName
} from "@unified-latex/unified-latex-util-macros";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import { anyMacro, match } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";

type NewCommandSpec = ReturnType<typeof listNewcommands>[number];

/**
 * Expands user-defined macros
 */
export function ExpandUserDefinedMacros(ast: Ast.Ast): void {
    const newcommands = listNewcommands(ast);

    // get a list of all macros to be expanded
    const macros_to_expand = getToBeExpandedMacros(newcommands);

    const macroInfo = Object.fromEntries(
        newcommands.map((m) => [m.name, { signature: m.signature }])
    );

    // recursively expand at most 100 times
    for (let i = 0; i < 100; i++) {
        // check if any macros still need expanding
        if (needToExpand(ast, macros_to_expand)) {
            ExpandUseDefinedMacrosOnce(ast, newcommands, macroInfo);
        }
    }
}

function getToBeExpandedMacros(newcommands: NewCommandSpec[]): string[] {
    const macros = [];

    // loop through each new command
    for (const command of newcommands) {
        macros.push(command.name)
    }

    return macros
}

function needToExpand(ast: Ast.Ast, macros: string[]): boolean {
    let needExpand = false;

    visit(ast, (node) => {
        if (anyMacro(node) && macros.includes(node.content)) {
            needExpand = true;
            EXIT;
        }
    })

    return needExpand;
}

function ExpandUseDefinedMacrosOnce(
    ast: Ast.Ast,
    newcommands: NewCommandSpec[],
    macroInfo: {
        [k: string]: {
            signature: string;
        };
    }
): void {
    // attach the arguments to each macro before processing it
    attachMacroArgs(ast, macroInfo);
    expandMacrosExcludingDefinitions(ast, newcommands);
}

