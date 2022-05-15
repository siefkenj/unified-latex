import Prettier from "prettier/standalone";
import { unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { unifiedLatexStringCompiler } from "./compiler-string";

const processor = unified()
    .use(unifiedLatexStringCompiler, { pretty: true })
    .freeze();

/**
 * Convert an AST into a string, pretty-printing the result. If you want more control
 * over the formatting (e.g. spaces/tabs, etc.) use `unified().use(unifiedLatexStringCompiler, options)`
 * directly.
 */
export function toString(ast: Ast.Ast): string {
    if (Array.isArray(ast)) {
        ast = { type: "root", content: ast };
    }
    if (ast.type !== "root") {
        ast = { type: "root", content: [ast as Ast.Node] };
    }
    return processor.stringify(ast);
}
