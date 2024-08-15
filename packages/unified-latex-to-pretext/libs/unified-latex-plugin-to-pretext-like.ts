import * as Hast from "hast";
import { Plugin, unified } from "unified";
import { unifiedLatexLintNoTexFontShapingCommands } from "@unified-latex/unified-latex-lint/rules/unified-latex-lint-no-tex-font-shaping-commands";
import * as Ast from "@unified-latex/unified-latex-types";
import { deleteComments } from "@unified-latex/unified-latex-util-comments";
import {
    anyEnvironment,
    anyMacro,
    match,
} from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    replaceNode,
    unifiedLatexReplaceStreamingCommands,
} from "@unified-latex/unified-latex-util-replace";
import { EXIT, SKIP, visit } from "@unified-latex/unified-latex-util-visit";
import { environmentReplacements as _environmentReplacements } from "./pre-conversion-subs/environment-subs";
import {
    attachNeededRenderInfo,
    katexSpecificEnvironmentReplacements,
    katexSpecificMacroReplacements,
} from "./pre-conversion-subs/katex-subs";
import { macroReplacements as _macroReplacements } from "./pre-conversion-subs/macro-subs";
import { streamingMacroReplacements } from "./pre-conversion-subs/streaming-command-subs";
import { unifiedLatexWrapPars } from "./unified-latex-wrap-pars";
import {
    breakOnBoundaries,
    isMappedEnviron,
} from "./pre-conversion-subs/break-on-boundaries";
import { reportMacrosUnsupportedByKatex } from "./pre-conversion-subs/report-unsupported-macro-katex";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { s } from "@unified-latex/unified-latex-builder";

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

    /**
     * A boolean where if it's true then the output won't be wrapped in the <pretext><article> ... etc. tags.
     * If it's false (default), a valid and complete PreTeXt document is returned.
     */
    producePretextFragment?: boolean;
};

/**
 * Unified plugin to convert a `unified-latex` AST into an html-like AST. This replaces nodes
 * with html-like macros `\html-tag:p{...}`, etc. macros. It is a step along the way to converting to HTML.
 * **It is unlikely you want to use this plugin directly**.
 *
 * Note: this plugin only wraps paragraphs in `p` tags if there are multiple paragraphs. Otherwise it omits the <p> tags.
 */
export const unifiedLatexToPretextLike: Plugin<
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
    const producePretextFragment = options?.producePretextFragment
        ? options?.producePretextFragment
        : false;

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

    return (tree, file) => {
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

        // convert division macros into environments
        const warningMessages = breakOnBoundaries(tree);

        // add warning messages into the file one at a time
        for (const warningMessage of warningMessages.messages) {
            file.message(
                warningMessage,
                warningMessage.position,
                "unified-latex-to-pretext:break-on-boundaries"
            );
        }

        // Must be done *after* streaming commands are replaced.
        // We only wrap PARs if we *need* to. That is, if the content contains multiple paragraphs
        if (shouldBeWrappedInPars(tree)) {
            processor = processor.use(unifiedLatexWrapPars);
        }
        tree = processor.runSync(tree, file);

        // Replace text-mode environments and then macros. Environments *must* be processed first, since
        // environments like tabular use `\\` as a newline indicator, but a `\\` macro gets replaced with
        // an empty Ast.String during macro replacement.
        replaceNode(tree, (node, info) => {
            // Children of math-mode are rendered by KaTeX/MathJax and so we shouldn't touch them!
            if (info.context.hasMathModeAncestor) {
                return;
            }
            if (isReplaceableEnvironment(node)) {
                return environmentReplacements[printRaw(node.env)](
                    node,
                    info,
                    file
                );
            }
        });

        replaceNode(tree, (node, info) => {
            // Children of math-mode are rendered by KaTeX/MathJax and so we shouldn't touch them!
            if (info.context.hasMathModeAncestor) {
                return;
            }
            if (isReplaceableMacro(node)) {
                const replacement = macroReplacements[node.content](
                    node,
                    info,
                    file
                );
                return replacement;
            }
        });

        // before replacing math-mode macros, report any macros that can't be replaced
        const unsupportedByKatex = reportMacrosUnsupportedByKatex(tree);

        // add these warning messages into the file one at a time
        for (const warningMessage of unsupportedByKatex.messages) {
            file.message(
                warningMessage,
                warningMessage.position,
                "unified-latex-to-pretext:report-unsupported-macro-katex"
            );
        }

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

        // Wrap in enough tags to ensure a valid pretext document
        if (!producePretextFragment) {
            // choose a book or article tag
            createValidPretextDoc(tree);

            // wrap around with pretext tag
            tree.content = [
                htmlLike({ tag: "pretext", content: tree.content }),
            ];
        }

        // Make sure we are actually mutating the current tree.
        originalTree.content = tree.content;
        console.log(file.messages);
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

    return containsPar(content);
}

function containsPar(content: Ast.Node[]): boolean {
    return content.some((node) => {
        if (isMappedEnviron(node)) {
            return containsPar(node.content);
        }

        return match.parbreak(node) || match.macro(node, "par");
    });
}

/**
 * Wrap the tree content in a book or article tag.
 */
function createValidPretextDoc(tree: Ast.Root): void {
    // this will be incomplete since the author info isn't pushed yet, which obtains documentclass, title, etc.
    let isBook: boolean = false;

    // look for a \documentclass (this will need to change, as this info will be gotten earlier)
    const docClass = findMacro(tree, "documentclass");

    // check if there was a documentclass
    if (docClass) {
        const docClassArg = getArgsContent(docClass)[0];

        // get the actual class
        if (docClassArg) {
            const docClassTitle = docClassArg[0] as Ast.String;

            // memoirs will be books too
            if (
                docClassTitle.content == "book" ||
                docClassTitle.content == "memoir"
            ) {
                isBook = true;
            }
        }
    }

    // if we still don't know if it's a book, look for _chapters environments (since breakonboundaries was called before)
    if (!isBook) {
        visit(tree, (node) => {
            if (anyEnvironment(node) && node.env == "_chapter") {
                isBook = true;
                return EXIT;
            }
        });
    }

    // a book and article tag must have a title tag right after it
    // extract the title first
    const title = findMacro(tree, "title");

    if (title) {
        const titleArg = getArgsContent(title)[1];

        // get the actual title
        if (titleArg) {
            const titleString = titleArg[0] as Ast.String;
            tree.content.unshift(
                htmlLike({ tag: "title", content: titleString })
            );
        }
        // if no title name was given, make an empty tag
        else {
            tree.content.unshift(htmlLike({ tag: "title", content: s("") }));
        }
    }
    // if there is no title, add an empty title tag
    else {
        tree.content.unshift(htmlLike({ tag: "title", content: s("") }));
    }

    // now create a book or article tag
    if (isBook) {
        tree.content = [htmlLike({ tag: "book", content: tree.content })];
    } else {
        tree.content = [htmlLike({ tag: "article", content: tree.content })];
    }
}

// this will likely be removed
function findMacro(tree: Ast.Root, content: string): Ast.Macro | null {
    let macro: Ast.Macro | null = null;

    // look for the macro
    visit(tree, (node) => {
        // skip visiting the children of environments
        if (anyEnvironment(node)) {
            return SKIP;
        }
        if (anyMacro(node) && node.content === content) {
            macro = node;
            return EXIT;
        }
    });

    return macro;
}
