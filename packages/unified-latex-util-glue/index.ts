export * from "./libs/find-glue";
export * from "./libs/parse";
export * from "./libs/print-glue";
export * from "./libs/types";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to parse TeX glue (e.g. `1in plus 3cm minus .2pt`).
 *
 * ## When should I use this?
 *
 * If you need access to the values of glue to analyze `\setlength` commands or write
 * linters.
 */
