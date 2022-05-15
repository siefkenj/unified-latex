import { unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { unifiedLatexStringCompiler } from "@unified-latex/unified-latex-util-to-string";
/**
 * Use `unified()` to a string to an `Ast.Ast` and then pretty-print it.
 */
export const processLatexViaUnified = () => {
    return unified()
        .use(unifiedLatexFromString)
        .use(unifiedLatexStringCompiler, { pretty: true });
};

/**
 * Use `unified()` to a string to an `Ast.Ast` and then return it. This function
 * will not print/pretty-print the `Ast.Ast` back to a string.
 */
export const processLatexToAstViaUnified = () => {
    return unified().use(unifiedLatexFromString).use(unifiedLatexAstComplier);
};
