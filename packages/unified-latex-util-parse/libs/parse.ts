import * as Ast from "@unified-latex/unified-latex-types";
import { unified } from "unified";
import { unifiedLatexFromString } from "./plugin-from-string";

const parser = unified().use(unifiedLatexFromString).freeze();

/**
 * Parse the string into an AST.
 */
export function parse(str: string): Ast.Root {
    return parser.parse(str);
}
