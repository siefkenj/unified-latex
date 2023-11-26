export * from "./libs/decorate-array-for-pegjs";
export * from "./libs/split-strings";
export * from "./libs/pegjs-parsers.js";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Pegjs grammars to help parse strings into a `unified-latex` Abstract Syntax Tree (AST). Note,
 * because of the dynamic nature of LaTeX, to get a full AST with arguments attached to macros, etc.,
 * the tree is parsed multiple times.
 *
 * Also included are functions to decorate a `Ast.Node[]` array so that Pegjs can process it as if it were
 * a string. This allows for complex second-pass parsing.
 *
 * ## When should I use this?
 *
 * If you are building libraries to parse specific LaTeX syntax (e.g., to parse `tabular` environments or
 * `systeme` environments, etc.).
 */
