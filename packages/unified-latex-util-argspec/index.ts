export * from "./libs/argspec-parser";
import * as ArgSpecAst from "./libs/argspec-types";
export { ArgSpecAst };

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Tools to deal with `xparse` argument signatures. (E.g., `"o m"` for optional followed by mandatory
 * argument).
 *
 * ## When should I use this?
 *
 * If you are working on the internals of `unified-latex`.
 */
