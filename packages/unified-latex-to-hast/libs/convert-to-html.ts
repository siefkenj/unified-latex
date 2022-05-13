import rehypeStringify from "rehype-stringify";
import { htmlLike } from "../../unified-latex-html-like";
import * as Ast from "../../unified-latex-types";
import { processLatexViaUnified } from "../../unified-latex-util-parse";
import { splitForPars } from "./split-for-pars";
import { unifiedLatexToHast } from "./unified-latex-plugin-to-hast";

const processor = processLatexViaUnified()
    .use(unifiedLatexToHast)
    .use(rehypeStringify);

/**
 * Convert the `unified-latex` AST `tree` into an HTML string. If you need
 * more precise control or further processing, consider using `unified`
 * directly with the `unifiedLatexToHast` plugin. 
 * 
 * For example,
 * ```
 * unified()
 *      .use(unifiedLatexToHast)
 *      .use(rehypeStringify)
 *      .processSync("\\LaTeX to convert")
 * ```
 */
export function convertToHtml(tree: Ast.Node | Ast.Node[]): string {
    if (!Array.isArray(tree) && tree.type !== "root") {
        tree = { type: "root", content: [tree] };
    }
    if (Array.isArray(tree)) {
        tree = { type: "root", content: tree };
    }

    const hast = processor.runSync(tree);
    return processor.stringify(hast);
}
