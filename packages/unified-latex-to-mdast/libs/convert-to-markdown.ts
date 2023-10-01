import type * as Ast from "@unified-latex/unified-latex-types";
import {
    PluginOptions,
    unifiedLatexToMdast,
} from "./unified-latex-plugin-to-mdast";
import remarkStringify from "remark-stringify";
import { processLatexViaUnified } from "@unified-latex/unified-latex";

const _processor = processLatexViaUnified()
    .use(unifiedLatexToMdast)
    .use(remarkStringify);

/**
 * Convert the `unified-latex` AST `tree` into a Markdown string. If you need
 * more precise control or further processing, consider using `unified`
 * directly with the `unifiedLatexToMdast` plugin.
 *
 * For example,
 * ```
 * unified()
 *      .use(unifiedLatexFromString)
 *      .use(unifiedLatexToMdast)
 *      .use(remarkStringify)
 *      .processSync("\\LaTeX to convert")
 * ```
 */
export function convertToMarkdown(
    tree: Ast.Node | Ast.Node[],
    options?: PluginOptions
): string {
    let processor = _processor;
    if (!Array.isArray(tree) && tree.type !== "root") {
        tree = { type: "root", content: [tree] };
    }
    if (Array.isArray(tree)) {
        tree = { type: "root", content: tree };
    }

    if (options) {
        processor = _processor.use(unifiedLatexToMdast, options);
    }

    const mdast = processor.runSync(tree);
    return processor.stringify(mdast);
}
