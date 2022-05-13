import { Plugin } from "unified";
import * as Ast from "../../unified-latex-types";

/**
 * Unified complier plugin that passes through a LaTeX AST without modification.
 */
export const unifiedLatexAstComplier: Plugin<void[], Ast.Root, Ast.Root> =
    function unifiedLatexAstComplier() {
        Object.assign(this, { Compiler: (x: Ast.Root) => x });
    };
