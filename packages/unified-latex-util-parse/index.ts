import { unified } from "unified";
import { unifiedLatexStringComplier } from "./libs/compiler-string";
import { unifiedLatexAstComplier } from "./libs/compiler-ast";
import { unifiedLatexFromString } from "./libs/plugin-from-string";

export * from "./libs/compiler-ast";
export * from "./libs/compiler-string";
export * from "./libs/plugin-from-string";
export * from "./libs/plugin-from-string-minimal";
export * from "./libs/parse-minimal";
export * from "./libs/parse";
export * from "./libs/parse-math";

/**
 * Use `unified()` to a string to an `Ast.Ast` and then pretty-print it.
 */
export const processLatexViaUnified = () => {
    return unified()
        .use(unifiedLatexFromString)
        .use(unifiedLatexStringComplier, { pretty: true });
};

/**
 * Use `unified()` to a string to an `Ast.Ast` and then return it. This function
 * will not print/pretty-print the `Ast.Ast` back to a string.
 */
export const processLatexToAstViaUnified = () => {
    return unified().use(unifiedLatexFromString).use(unifiedLatexAstComplier);
};

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions parse strings to a `unified-latex` Abstract Syntax Tree (AST).
 *
 * ## When should I use this?
 *
 * If you have a string that you would like to parse to a `unified-latex` `Ast.Ast`, or
 * if you are building a plugin for `unified()` that manipulates LaTeX.
 */
