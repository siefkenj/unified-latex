import * as Ast from "@unified-latex/unified-latex-types";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import {
    expandMacrosExcludingDefinitions,
    listNewcommands,
} from "@unified-latex/unified-latex-util-macros";
import { Plugin } from "unified";

type PluginOptions = {
    macros?: string[];
};

/**
 * Plugin that expands the specified macros by name. These macros must be defined in the document via
 * `\newcommand...` or equivalent.
 */
export const expandDocumentMacrosPlugin: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function (options) {
    const { macros = [] } = options || {};
    const macrosSet = new Set(macros);

    return (tree) => {
        const newcommands = listNewcommands(tree);
        const macros = newcommands.filter((s) => macrosSet.has(s.name));

        const macroInfo = Object.fromEntries(
            macros.map((m) => [m.name, { signature: m.signature }])
        );
        // We need to attach the arguments to each macro before we process it!
        attachMacroArgs(tree, macroInfo);
        expandMacrosExcludingDefinitions(tree, macros);
    };
};
