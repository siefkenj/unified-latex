import type * as Hast from "hast";
import type * as Mdast from "mdast";
import { Plugin, unified } from "unified";
import type * as Ast from "@unified-latex/unified-latex-types";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { PluginOptions as HtmlLikePluginOptions } from "@unified-latex/unified-latex-to-hast";
import rehypeRemark, { Options as RehypeRemarkOptions } from "rehype-remark";
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

    return (tree: Ast.Root, file) => {
        const mdast = unified()
            .use(unifiedLatexToHast, options)
            .use(rehypeRemark, options)
            // @ts-ignore
            .runSync(tree, file);
        return mdast as Mdast.Root;
    };
};
