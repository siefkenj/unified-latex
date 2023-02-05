export { gobbleArguments } from "./libs/gobble-arguments";
export {
    attachMacroArgs,
    attachMacroArgsInArray,
} from "./libs/attach-arguments";
export * from "./libs/unified-latex-attach-macro-arguments";
export * from "./libs/get-args-content";
export * from "./libs/gobble-single-argument";
export * from "./libs/gobble-arguments";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to help modify and attach arguments to macros in a `unified-latex` Abstract Syntax Tree (AST).
 *
 * By default, TeX doesn't actually have a concept of macro "arguments". Instead, TeX searches the
 * tokens after a macro and processes them according to the macro's rules. However, LaTeX attempts
 * to make macros look like functions that accept arguments. To attach the "arguments" to a macro
 * node, the `unified-latex` AST needs to be reparsed and manipulated.
 *
 * ## When should I use this?
 *
 * If you have custom macros that you want arguments attached to.
 *
 * If you know ahead of time which macros need arguments attached to them, use `unified-latex-util-parse`
 * and pass in the appropriate macro info instead.
 */
