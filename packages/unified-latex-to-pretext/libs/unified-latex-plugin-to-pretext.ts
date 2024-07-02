import * as Xast from "xast";
import { x } from "xastscript";
import { Plugin, unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { TypeGuard } from "@unified-latex/unified-latex-types";
import { expandUnicodeLigatures } from "@unified-latex/unified-latex-util-ligatures";
import { match } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { toPretextWithLoggerFactory } from "./pretext-subs/to-pretext";
import {
    unifiedLatexToXmlLike,
    PluginOptions as HtmlLikePluginOptions,
} from "./unified-latex-plugin-to-xml-like";

export type PluginOptions = HtmlLikePluginOptions & {};

/**
 * Unified plugin to convert a `unified-latex` AST into a `xast` AST representation of PreTeXt source.
 */
export const unifiedLatexToPretext: Plugin<
    PluginOptions[],
    Ast.Root,
    Xast.Root
> = function unifiedLatexAttachMacroArguments(options) {
    return (tree, file) => {
        unified().use(unifiedLatexToXmlLike, options).run(tree);

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

        const toHast = toPretextWithLoggerFactory(file.message.bind(file));
        let converted = toHast({ type: "root", content });
        if (!Array.isArray(converted)) {
            converted = [converted];
        }
        // Wrap everything in a Hast.Root node
        let ret = x();
        ret.children = converted;
        return ret;
    };
};
