import type * as Hast from "hast";
import type * as Mdast from "mdast";
import { Plugin, unified } from "unified";
import type * as Ast from "@unified-latex/unified-latex-types";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { PluginOptions as HtmlLikePluginOptions } from "@unified-latex/unified-latex-to-hast";
import rehypeRemark, { Options as RehypeRemarkOptions } from "rehype-remark";
import { VFile } from "vfile";
import { defaultHandlers } from "./remark-handlers-defaults";

export type PluginOptions = HtmlLikePluginOptions & RehypeRemarkOptions;

/**
 * Unified plugin to convert a `unified-latex` AST into a `mdast` AST.
 */
export const unifiedLatexToMdast: Plugin<
    PluginOptions[],
    Ast.Root,
    Mdast.Root
> = function unifiedLatexToMdast(options) {
    // Overlay the supplied handlers on top of the default handlers
    const handlers = Object.assign({}, defaultHandlers, options?.handlers);
    options = Object.assign({}, options, { handlers });

    return (tree: Ast.Root, file: VFile) => {
        const mdast = unified()
            .use(unifiedLatexToHast, options)
            .use(rehypeRemark, options)
            .runSync(tree, file as any) as Mdast.Root;
        return mdast;
    };
};
