export * from "./libs/builders";
export * from "./libs/extractors";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to help with making html-like nodes in a `unified-latex` Abstract Syntax Tree (AST).
 *
 * For example, `<p>foo</p>` can be stored as `\html-tag:p{foo}` in `unified-latex`. Because `-` and `:`
 * are special characters, they cannot appear in a macro name, so there is no risk of name conflicts.
 * These macros are created programmatically, so special characters can be inserted.
 *
 * ## When should I use this?
 *
 * If you are converting LaTeX to HTML, these functions may be used as an intermediate format.
 *
 */
