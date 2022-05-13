import { GluePegParser } from "../../unified-latex-util-pegjs";
import { Glue } from "./types";

/**
 * Parse a string that starts with TeX glue (e.g. `1pt` or `1pt plus 2em`).
 * It is assumed that all whitespace and comments have been stripped from the glue
 */
export function parseTexGlue(source: string): Glue | null {
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    try {
        return GluePegParser.parse(source);
    } catch {}
    return null;
}
