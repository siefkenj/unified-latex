import * as Hast from "hast";
import rehypeRaw from "rehype-raw";
import { h } from "hastscript";
import { Plugin, unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { TypeGuard } from "@unified-latex/unified-latex-types";
import { expandUnicodeLigatures } from "@unified-latex/unified-latex-util-ligatures";
import { match } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { toHastWithLoggerFactory } from "./html-subs/to-hast";
import {
    unifiedLatexToHtmlLike,
    PluginOptions as HtmlLikePluginOptions,
} from "./unified-latex-plugin-to-html-like";

export type PluginOptions = HtmlLikePluginOptions & {
    /**
     * By default, `unifiedLatexToHast` will force the output to be valid HTML.
     * This is accomplished by running `rehypeRaw` on the output which will ensure
     * there are no nested `<p>` tags, and that block elements don't end up as children of `<span>`s,
     * etc. Set to `true` to skip this check.
     */
    skipHtmlValidation?: boolean;
};

/**
 * Unified plugin to convert a `unified-latex` AST into a `hast` AST.
 */
export const unifiedLatexToHast: Plugin<PluginOptions[], Ast.Root, Hast.Root> =
    function unifiedLatexAttachMacroArguments(options) {
        const { skipHtmlValidation = false } = options || {};
        return (tree, file) => {
            unified().use(unifiedLatexToHtmlLike, options).run(tree);

            // This should happen right before converting to HTML because macros like `\&` should
            // be expanded via html rules first (and not turned into their corresponding ligature directly)
            expandUnicodeLigatures(tree);

            // If there is a \begin{document}...\end{document}, that's the only
            // content we want to convert.
            let content = tree.content;
            visit(
                tree,
                (env) => {
                    content = env.content;
                    return EXIT;
                },
                {
                    test: ((node) =>
                        match.environment(
                            node,
                            "document"
                        )) as TypeGuard<Ast.Environment>,
                }
            );

            const toHast = toHastWithLoggerFactory(file.message.bind(file));
            let converted = toHast({ type: "root", content });
            if (!Array.isArray(converted)) {
                converted = [converted];
            }
            // Wrap everything in a Hast.Root node
            let ret = h();
            ret.children = converted;
            if (!skipHtmlValidation) {
                // We never want to produce invalid HTML, so we reparse the HTML we have generated.
                // Ideally, any invalid HTML generation should be caught and fixed where it is, but
                // we don't want to upset library users with invalid HTML
                ret = unified().use(rehypeRaw).runSync(ret);
            }
            return ret;
        };
    };
