import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { MacroInfoRecord } from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { attachMacroArgsInArray } from "./attach-arguments";

type PluginOptions = { macros: MacroInfoRecord } | undefined;

/**
 * Unified plugin to attach macro arguments to the macros specified via the `macros`
 * option.
 *
 * @param macros An object whose keys are macro names and values contains information about the macro and its argument signature.
 */
export const unifiedLatexAttachMacroArguments: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexAttachMacroArguments(options) {
    return (tree) => {
        const { macros = {} } = options || {};
        if (Object.keys(macros).length === 0) {
            console.warn(
                "Attempting to attach macro arguments but no macros are specified."
            );
        }
        visit(
            tree,
            (nodes) => {
                attachMacroArgsInArray(nodes, macros);
            },
            { includeArrays: true, test: Array.isArray }
        );
    };
};
