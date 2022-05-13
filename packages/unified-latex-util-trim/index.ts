export * from "./libs/trim";
export * from "./libs/unified-latex-trim-environment-contents";
export * from "./libs/unified-latex-trim-root";
export * from "./libs/has-whitespace-equivalent";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to help modify a `unified-latex` Abstract Syntax Tree (AST).
 *
 * ## When should I use this?
 *
 * If you want to remove whitespace from the ends of an array of nodes.
 *
 * Note that whitespace can come from a `Ast.Whitespace` node or from an
 * `Ast.Comment` node that has leading whitespace. These functions take care
 * to deal with both situations.
 */
