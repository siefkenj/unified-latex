import { unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { unifiedLatexFromString } from "./plugin-from-string";

/**
 * Parse `str` into an AST. Parsing starts in math mode and a list of
 * nodes is returned (instead of a "root" node).
 */
export function parseMath(str: string | Ast.Ast): Ast.Node[] {
    if (typeof str !== "string") {
        str = printRaw(str);
    }
    const parser = unified()
        .use(unifiedLatexFromString, { mode: "math" })
    return (parser.parse({ value: str }) as Ast.Root).content;
}
