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
import { expandUserDefinedMacros } from "./pre-conversion-subs/expand-user-defined-macros";

export type PluginOptions = HtmlLikePluginOptions & {
    /**
     * A boolean where if it's true then the output won't be wrapped in the <pretext><article> ... etc. tags.
     * If it's false (default), a valid and complete PreTeXt document is returned.
     */
    producePretextFragment?: boolean;
};

/**
 * Unified plugin to convert a `unified-latex` AST into a `xast` AST representation of PreTeXt source.
 */
export const unifiedLatexToPretext: Plugin<
    PluginOptions[],
    Ast.Root,
    Xast.Root
> = function unifiedLatexAttachMacroArguments(options) {
    return (tree, file) => {
        const producePretextFragment = options?.producePretextFragment
            ? options?.producePretextFragment
            : false;

        // expand user defined macros
        expandUserDefinedMacros(tree);

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

        // since we don't want to wrap content outside of \begin{document}...\end{document} with <pretext>...</pretext>
        tree.content = content;

        unified().use(unifiedLatexToXmlLike, options).run(tree, file);

        // This should happen right before converting to PreTeXt because macros like `\&` should
        // be expanded via html rules first (and not turned into their corresponding ligature directly)
        expandUnicodeLigatures(tree);

        // update content
        content = tree.content;

        const toXast = toPretextWithLoggerFactory(file.message.bind(file));
        let converted = toXast({ type: "root", content });
        if (!Array.isArray(converted)) {
            converted = [converted];
        }
        // Wrap everything in a Xast.Root node
        let ret = x();
        ret.children = converted;

        // add boilerplate
        if (!producePretextFragment) {
            ret.children.unshift({
                type: "instruction",
                name: "xml",
                value: "version='1.0' encoding='utf-8'",
            });
        }
        return ret;
    };
};
