import * as Ast from "@unified-latex/unified-latex-types";
import { Plugin } from "unified";
import { reparseExpl3AndAtLetterRegions } from "@unified-latex/unified-latex-util-catcode";
import {
    hasReparsableMacroNames,
    reparseMacroNames,
} from "@unified-latex/unified-latex-util-catcode";

type PluginOptions =
    | {
          /**
           * Whether to parse macros as if `\makeatletter` is set (i.e., parse `@` as a regular macro character).
           * If this option is true, it disables autodetect.
           */
          atLetter?: boolean;
          /**
           * Whether to parse macros as if `\ExplSyntaxOn` is set (i.e., parse `_` and `:` as a regular macro character)
           * If this option is true, it disables autodetect.
           */
          expl3?: boolean;
          /**
           * Attempt to autodetect whether there are macros that look like they should contain `@`, `_`, or `:`.
           * Defaults to `true`.
           */
          autodetectExpl3AndAtLetter?: boolean;
      }
    | undefined;

/**
 * Unified plugin to reprocess macros names to possibly include `@`, `_`, or `:`.
 * This plugin detects the `\makeatletter` and `\ExplSyntaxOn` commands and reprocesses macro names
 * inside of those blocks to include those characters.
 */
export const unifiedLatexProcessAtLetterAndExplMacros: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexProcessAtLetterAndExplMacros(options) {
    let {
        atLetter = false,
        expl3 = false,
        autodetectExpl3AndAtLetter = false,
    } = options || {};

    return (tree) => {
        // First we reparse based on explicit \makeatletter and \ExplSyntaxOn macros
        reparseExpl3AndAtLetterRegions(tree);
        if (atLetter || expl3) {
            autodetectExpl3AndAtLetter = false;
        }
        if (autodetectExpl3AndAtLetter) {
            atLetter = hasReparsableMacroNames(tree, "@");
            // We don't check for the `:` here because it could be prone to misidentification.
            expl3 = hasReparsableMacroNames(tree, "_");
        }
        const charSet: Set<string> = new Set();
        if (atLetter) {
            charSet.add("@");
        }
        if (expl3) {
            charSet.add(":");
            charSet.add("_");
        }

        if (charSet.size > 0) {
            reparseMacroNames(tree, charSet);
        }
    };
};
