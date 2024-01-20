import * as Hast from "hast";
import { Plugin, unified } from "unified";
import { unifiedLatexLintNoTexFontShapingCommands } from "@unified-latex/unified-latex-lint/rules/unified-latex-lint-no-tex-font-shaping-commands";
import * as Ast from "@unified-latex/unified-latex-types";
import { deleteComments } from "@unified-latex/unified-latex-util-comments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    replaceNode,
    unifiedLatexReplaceStreamingCommands,
} from "@unified-latex/unified-latex-util-replace";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { environmentReplacements as _environmentReplacements } from "./pre-html-subs/environment-subs";
import {
    attachNeededRenderInfo,
    katexSpecificEnvironmentReplacements,
    katexSpecificMacroReplacements,
} from "./pre-html-subs/katex-subs";
import { macroReplacements as _macroReplacements } from "./pre-html-subs/macro-subs";
import { streamingMacroReplacements } from "./pre-html-subs/streaming-command-subs";
import { unifiedLatexWrapPars } from "./unified-latex-wrap-pars";

type EnvironmentReplacements = typeof _environmentReplacements;
type MacroReplacements = typeof _macroReplacements;

export type PluginOptions = {
    /**
     * Functions called to replace environments during processing. Key values should match environment names.
     *  You probably want to use the function `htmlLike(...)` to return a node that gets converted to specific HTML.
     */
    environmentReplacements?: EnvironmentReplacements;
    /**
     * Functions called to replace macros during processing. Key values should match macro names.
     * You probably want to use the function `htmlLike(...)` to return a node that gets converted to specific HTML.
     */
    macroReplacements?: MacroReplacements;
};

/**
 * Unified plugin to convert a `unified-latex` AST into an html-like AST. This replaces nodes
 * with html-like macros `\html-tag:p{...}`, etc. macros. It is a step along the way to converting to HTML.
 * **It is unlikely you want to use this plugin directly**.
 *
 * Note: this plugin only wraps paragraphs in `p` tags if there are multiple paragraphs. Otherwise it omits the <p> tags.
 */
export const unifiedLatexToHtmlLike: Plugin<
    PluginOptions[],
    Ast.Root,
    Hast.Root
> = function unifiedLatexToHtmlLike(options) {
    const macroReplacements = Object.assign(
        {},
        _macroReplacements,
        options?.macroReplacements || {}
    );
    const environmentReplacements = Object.assign(
        {},
        _environmentReplacements,
        options?.environmentReplacements || {}
    );
    const isReplaceableMacro = match.createMacroMatcher(macroReplacements);
    const isReplaceableEnvironment = match.createEnvironmentMatcher(
        environmentReplacements
    );
    const isKatexMacro = match.createMacroMatcher(
        katexSpecificMacroReplacements
    );
    const isKatexEnvironment = match.createEnvironmentMatcher(
        katexSpecificEnvironmentReplacements
    );

    return (tree) => {
        const originalTree = tree;
        // NOTE: These operations need to be done in a particular order.

        // We _could_ keep comments around in html, but that can complicate dealing with whitespace,
        // so we remove them.
        deleteComments(tree);
        let processor = unified()
            // Replace `\bf` etc. with `\bfseries`. Only the latter are auto-recognized streaming commands
            .use(unifiedLatexLintNoTexFontShapingCommands, { fix: true })
            .use(unifiedLatexReplaceStreamingCommands, {
                replacers: streamingMacroReplacements,
            });

        // Must be done *after* streaming commands are replaced.
        // We only wrap PARs if we *need* to. That is, if the content contains multiple paragraphs
        if (shouldBeWrappedInPars(tree)) {
            processor = processor.use(unifiedLatexWrapPars);
        }
        tree = processor.runSync(tree);

        // Replace text-mode environments and then macros. Environments *must* be processed first, since
        // environments like tabular use `\\` as a newline indicator, but a `\\` macro gets replaced with
        // a `<br />` during macro replacement.
        replaceNode(tree, (node, info) => {
            // Children of math-mode are rendered by KaTeX/MathJax and so we shouldn't touch them!
            if (info.context.hasMathModeAncestor) {
                return;
            }
            if (isReplaceableEnvironment(node)) {
                return environmentReplacements[printRaw(node.env)](node, info);
            }
        });
        replaceNode(tree, (node, info) => {
            // Children of math-mode are rendered by KaTeX/MathJax and so we shouldn't touch them!
            if (info.context.hasMathModeAncestor) {
                return;
            }
            if (isReplaceableMacro(node)) {
                const replacement = macroReplacements[node.content](node, info);
                return replacement;
            }
        });

        // Replace math-mode macros for appropriate KaTeX rendering
        attachNeededRenderInfo(tree);
        replaceNode(tree, (node) => {
            if (isKatexMacro(node)) {
                return katexSpecificMacroReplacements[node.content](node);
            }
            if (isKatexEnvironment(node)) {
                return katexSpecificEnvironmentReplacements[printRaw(node.env)](
                    node
                );
            }
        });

        // Make sure we are actually mutating the current tree.
        originalTree.content = tree.content;
    };
};

/**
 * Does the content contain multiple paragraphs? If so, it should be wrapped in `p` tags.
 */
function shouldBeWrappedInPars(tree: Ast.Root): boolean {
    let content = tree.content;
    visit(
        tree,
        (env) => {
            if (match.anyEnvironment(env)) {
                content = env.content;
                return EXIT;
            }
        },
        { test: (node) => match.environment(node, "document") }
    );

    return content.some(
        (node) => match.parbreak(node) || match.macro(node, "par")
    );
}
