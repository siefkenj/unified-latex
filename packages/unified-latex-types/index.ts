export * from "./libs/ast-types";
export * from "./libs/type-guard";
export * from "./libs/info-specs";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Types for the `unified-latex` Abstract Syntax Tree (AST). These types extend the `unist` AST,
 * but instead of a `children` attribute, they have a `content` attribute.
 *
 * ## When should I use this?
 *
 * If you're working with `unified-latex` ASTs.
 */
