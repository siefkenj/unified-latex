export * from "./libs/split-on-macro";
export * from "./libs/split-on-condition";
export * from "./libs/unsplit-on-macro";
export * from "./libs/array-join";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to manipulate `unified-latex` Abstract Syntax Tree (AST).
 *
 * ## When should I use this?
 *
 * If you want break apart or join an array of nodes based on a condition. For example,
 * this is used to split on `&` characters in the `align` environment.
 */