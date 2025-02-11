import { toXml } from "xast-util-to-xml";
import * as Ast from "@unified-latex/unified-latex-types";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import {
    unifiedLatexToPretext,
    PluginOptions,
} from "./unified-latex-plugin-to-pretext";
import { Plugin } from "unified";
import { Nodes, Root } from "xast";

/**
 * Unified plugin to convert a `XAST` AST to a string.
 */
export const xmlCompilePlugin: Plugin<void[], Root, string> = function () {
    this.Compiler = (tree: Nodes | Nodes[]) => toXml(tree, { closeEmptyElements: true });
};

const _processor = processLatexViaUnified()
    .use(unifiedLatexToPretext)
    .use(xmlCompilePlugin);

/**
 * Convert the `unified-latex` AST `tree` into an HTML string. If you need
 * more precise control or further processing, consider using `unified`
 * directly with the `unifiedLatexToPretext` plugin.
 *
 * For example,
 * ```
 * unified()
 *      .use(unifiedLatexFromString)
 *      .use(unifiedLatexToPretext)
 *      .use(rehypeStringify)
 *      .processSync("\\LaTeX to convert")
 * ```
 */
export function convertToPretext(
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
        processor = _processor.use(unifiedLatexToPretext, options);
    }

    const hast = processor.runSync(tree);
    return processor.stringify(hast);
}
