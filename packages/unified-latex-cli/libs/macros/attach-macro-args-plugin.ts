import * as Ast from "@unified-latex/unified-latex-types";
import { Plugin } from "unified";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";

type PluginOptions = {
    macros: { name: string; signature: string }[];
};

/**
 * Plugin that attaches the arguments of the specified macros.
 */
export const attachMacroArgsPlugin: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function (options) {
    const { macros = [] } = options || {};
    const macroInfo = Object.fromEntries(
        macros.map((m) => [m.name, { signature: m.signature }])
    );
    return (tree) => {
        // We need to attach the arguments to each macro before we process it!
        attachMacroArgs(tree, macroInfo);
    };
};
