import { unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
    PluginOptions as ParserPluginOptions,
} from "@unified-latex/unified-latex-util-parse";
import {
    unifiedLatexStringCompiler,
    PluginOptions as StringCompilerPluginOptions,
} from "@unified-latex/unified-latex-util-to-string";

/**
 * Use `unified()` to a string to an `Ast.Ast` and then pretty-print it.
 */
export const processLatexViaUnified = (
    options?: StringCompilerPluginOptions & ParserPluginOptions
) => {
    return unified()
        .use(unifiedLatexFromString, options)
        .use(
            unifiedLatexStringCompiler,
            Object.assign({ pretty: true }, options)
        );
};

/**
 * Use `unified()` to a string to an `Ast.Ast` and then return it. This function
 * will not print/pretty-print the `Ast.Ast` back to a string.
 */
export const processLatexToAstViaUnified = (
    options?: ParserPluginOptions
) => {
    return unified().use(unifiedLatexFromString, options).use(unifiedLatexAstComplier);
};
