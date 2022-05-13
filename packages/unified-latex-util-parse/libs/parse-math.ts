import { unified } from "unified";
import * as Ast from "../../unified-latex-types";
import { printRaw } from "../../unified-latex-util-print-raw";
import { unifiedLatexAstComplier } from "./compiler-ast";
import { unifiedLatexFromString } from "./plugin-from-string";

/**
 * Parse `str` into an AST. Parsing starts in math mode and a list of
 * nodes is returned (instead of a "root" node).
 */
export function parseMath(str: string | Ast.Ast): Ast.Node[] {
    if (typeof str !== "string") {
        str = printRaw(str);
    }
    const file = unified()
        .use(unifiedLatexFromString, { mode: "math" })
        .use(unifiedLatexAstComplier)
        .processSync({ value: str });
    return (file.result as Ast.Root).content;
}
