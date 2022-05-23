import { unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import {
    unifiedLatexStringCompiler,
    PluginOptions as StringCompilerPluginOptions,
} from "@unified-latex/unified-latex-util-to-string";
/**
 * Use `unified()` to a string to an `Ast.Ast` and then pretty-print it.
 */
export const processLatexViaUnified = (
    options?: StringCompilerPluginOptions
) => {
    return unified()
        .use(unifiedLatexFromString)
        .use(
            unifiedLatexStringCompiler,
            Object.assign({ pretty: true }, options)
        );
};

/**
 * Use `unified()` to a string to an `Ast.Ast` and then return it. This function
 * will not print/pretty-print the `Ast.Ast` back to a string.
 */
export const processLatexToAstViaUnified = () => {
    return unified().use(unifiedLatexFromString).use(unifiedLatexAstComplier);
};
