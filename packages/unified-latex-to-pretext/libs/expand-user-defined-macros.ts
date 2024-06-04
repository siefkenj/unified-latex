import * as Ast from "@unified-latex/unified-latex-types";
import {
    expandMacrosExcludingDefinitions,
    listNewcommands,
} from "@unified-latex/unified-latex-util-macros";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";

/**
 * Expands user-defined macros
 */
export function ExpandUserDefinedMacros(ast: Ast.Ast): void {
    const newcommands = listNewcommands(ast);

    const macroInfo = Object.fromEntries(
        newcommands.map((m) => [m.name, { signature: m.signature }])
    );

    // attach the arguments to each macro before processing it
    attachMacroArgs(ast, macroInfo);
    expandMacrosExcludingDefinitions(ast, newcommands);
}
