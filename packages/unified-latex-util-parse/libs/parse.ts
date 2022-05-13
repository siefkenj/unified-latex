import { processLatexToAstViaUnified } from "..";
import * as Ast from "../../unified-latex-types";

/**
 * Parse the string into an AST.
 */
export function parse(str: string): Ast.Root {
    const file = processLatexToAstViaUnified().processSync({ value: str });
    return file.result as Ast.Root;
}
