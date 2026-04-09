import * as Xast from "xast";
import { x } from "xastscript";
import { Plugin, unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { TypeGuard } from "@unified-latex/unified-latex-types";
import { expandUnicodeLigatures } from "@unified-latex/unified-latex-util-ligatures";
import { match } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { attachMacroArgs, gobbleArguments } from "@unified-latex/unified-latex-util-arguments";

/** Replace Unicode characters produced by ligature expansion with plain ASCII. */
function unicodeToAscii(str: string): string {
    return str
        .replace(/\u2014/g, "---")   // em dash
        .replace(/\u2013/g, "--")    // en dash
        .replace(/\u00A0/g, " ")     // non-breaking space
        .replace(/\u201C/g, "``")    // left double quote
        .replace(/\u201D/g, "''")    // right double quote
        .replace(/\u2018/g, "`")     // left single quote
        .replace(/\u2019/g, "'")     // right single quote / apostrophe
        .replace(/\u00AB/g, "<<")    // left guillemet
        .replace(/\u00BB/g, ">>")    // right guillemet
        .replace(/\u2026/g, "...")   // ellipsis
        .replace(/\u2009/g, " ")     // thin space
        .replace(/\u2005/g, " ")     // four-per-em space
        .replace(/\u2002/g, " ")     // en space
        .replace(/\u2003/g, " ");    // em space
}
import { toPretextWithLoggerFactory } from "./pretext-subs/to-pretext";
import {
    unifiedLatexToPretextLike,
    PluginOptions as HtmlLikePluginOptions,
} from "./unified-latex-plugin-to-pretext-like";
import { expandUserDefinedMacros } from "./pre-conversion-subs/expand-user-defined-macros";
import { replaceQuoteLigatures } from "./pre-conversion-subs/replace-quote-ligatures";
import {
    macros as pretextMacros,
    environments as pretextEnvironments,
} from "./provides";
import { fixExamMacroArgs } from "./pre-conversion-subs/exam-subs";

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

        // Replace LaTeX quote ligatures (``...'' and `...') with \enquote{}/\sq{}
        // macros BEFORE macro-argument attachment so they flow through the normal pipeline.
        replaceQuoteLigatures(tree);

        // Attach PreTeXt-specific macro arguments
        attachMacroArgs(tree, pretextMacros);

        // Attach arguments for PreTeXt-specific environments (e.g. optional title)
        // that are not defined in any CTAN package and thus not processed by the parser.
        visit(tree, (node) => {
            if (!match.environment(node)) return;
            const envName = printRaw(node.env);
            const envInfo = pretextEnvironments[envName];
            if (envInfo?.signature && node.args == null) {
                const { args } = gobbleArguments(node.content, envInfo.signature);
                node.args = args;
            }
        });
        // The parser already ran cleanEnumerateBody on exam environments (via the CTAN
        // exam package's processContent hooks). This re-processes exam item macros to
        // extract optional [points] from the beginning of their bodies, so that
        // args[0] = optional points and args[1] = question body.
        fixExamMacroArgs(tree);

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

        unified().use(unifiedLatexToPretextLike, options).run(tree, file);

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
        // Replace any remaining Unicode characters with ASCII equivalents
        // so the output is clean ASCII XML.
        (function normalizeToAscii(nodes: Xast.Nodes[]) {
            for (const node of nodes) {
                if (node.type === "text") {
                    node.value = unicodeToAscii(node.value);
                } else if ("children" in node) {
                    normalizeToAscii(node.children as Xast.Nodes[]);
                }
            }
        })(ret.children);

        return ret;
    };
};
