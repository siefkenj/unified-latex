import { LatexPegParser } from "@unified-latex/unified-latex-util-pegjs";
import * as Ast from "@unified-latex/unified-latex-types";

/**
 * Parse `str` to an AST with minimal processing. E.g., macro
 * arguments are not attached to macros, etc. when parsed with this
 * function.
 */
export function parseMinimal(str: string): Ast.Root {
    return LatexPegParser.parse(str);
}

/**
 * Parse `str` to an AST with minimal processing. E.g., macro
 * arguments are not attached to macros, etc. when parsed with this
 * function.
 *
 * The parsing assumes a math-mode context, so, for example, `^` and `_` are
 * parsed as macros (even though arguments are not attached to them).
 */
export function parseMathMinimal(str: string): Ast.Node[] {
    return LatexPegParser.parse(str, { startRule: "math" });
}
