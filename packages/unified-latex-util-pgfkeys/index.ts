export * from "./libs/pgfkeys-parser";
export * from "./libs/pgfkeys-to-object";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to help manipulate `unified-latex` Abstract Syntax Tree (AST) that contain
 * pgfkeys-style arguments. Note that pgfkeys aren't built into `Ast.Ast`. Instead, parsing
 * nodes as pgfkeys will produce a new (incompatible) AST.
 *
 * ## When should I use this?
 *
 * If you want to parse or manipulate macros/environments with pgfkeys-style arguments.
 */
