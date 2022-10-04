export * from "./libs/find-region";
export * from "./libs/special-regions";
export * from "./libs/reparse-macro-names";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to identify regions of a `unified-latex` Abstract Syntax Tree (AST) that need to be reparsed because of different
 * category codes. For example, regions between `\makeatletter` and `\makeatother`.
 *
 * ## When should I use this?
 *
 * If you need to identify regions of the AST that need to be reparsed.
 */
