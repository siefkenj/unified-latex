import * as Hast from "hast";
import { Plugin, unified } from "unified";
import { unifiedLatexLintNoTexFontShapingCommands } from "@unified-latex/unified-latex-lint/rules/unified-latex-lint-no-tex-font-shaping-commands";
import * as Ast from "@unified-latex/unified-latex-types";
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
import { examEnvironmentReplacements } from "./pre-conversion-subs/exam-subs";
import { attachVerticalSpaceWorkspace } from "./pre-conversion-subs/vertical-space-subs";
import {
    attachNeededRenderInfo,
    mathjaxSpecificEnvironmentReplacements,
    mathjaxSpecificMacroReplacements,
} from "./pre-conversion-subs/katex-subs";
import { macroReplacements as _macroReplacements } from "./pre-conversion-subs/macro-subs";
import {
    createPlusMacroReplacements,
    PlusIncludeOptions,
} from "./pre-conversion-subs/plus-subs";
import { streamingMacroReplacements } from "./pre-conversion-subs/streaming-command-subs";
import { unifiedLatexWrapPars } from "./unified-latex-wrap-pars";
import {
    breakOnBoundaries,
    isMappedEnviron,
    isSlideEnviron,
    isTopLevelDocEnviron,
} from "./pre-conversion-subs/break-on-boundaries";
import { reportMacrosUnsupportedByMathjax } from "./pre-conversion-subs/report-unsupported-macro-mathjax";
import {
    extractFromHtmlLike,
    htmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { s } from "@unified-latex/unified-latex-builder";
import { sanitizeXmlId } from "./pre-conversion-subs/utils";

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
     * Options controlling how modular includes (`\plus[attrs]{type}{ref}` and
     * `\include{ref}`) are converted: `<plus:type ref="..."/>` (default) or
     * `<xi:include href="..."/>`.
     */
    plusIncludes?: PlusIncludeOptions;

    /**
     * A boolean where if it's true then the output won't be wrapped in the <pretext><article> ... etc. tags.
     * If it's false (default), a valid and complete PreTeXt document is returned.
     */
    producePretextFragment?: boolean;

    /**
     * A pre-built `<frontmatter>` node (see `bibinfo.ts`), computed by
     * `unifiedLatexToPretext` from preamble macros before this plugin runs.
     * Not meant to be set directly -- inserted right after `<title>` when present.
     */
    frontmatter?: Ast.Macro | null;
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
        createPlusMacroReplacements(options?.plusIncludes),
        options?.macroReplacements || {}
    );
    const environmentReplacements = Object.assign(
        {},
        _environmentReplacements,
        examEnvironmentReplacements,
        options?.environmentReplacements || {}
    );
    const producePretextFragment = options?.producePretextFragment
        ? options?.producePretextFragment
        : false;

    const isReplaceableMacro = match.createMacroMatcher(macroReplacements);
    const isReplaceableEnvironment = match.createEnvironmentMatcher(
        environmentReplacements
    );
    const isMathjaxMacro = match.createMacroMatcher(
        mathjaxSpecificMacroReplacements
    );
    const isMathjaxEnvironment = match.createEnvironmentMatcher(
        mathjaxSpecificEnvironmentReplacements
    );

    return (tree: Ast.Root, file: any) => {
        const originalTree = tree;
        // NOTE: These operations need to be done in a particular order.

        // Comments are kept and converted to XML comments (`toPretext` handles
        // the whitespace a comment absorbs). However, math content is rendered
        // raw (via `printRaw`), where a literal `%` would corrupt the math, so
        // comments inside math mode are removed.
        deleteCommentsInMathMode(tree);
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
                warningMessage.place,
                "unified-latex-to-pretext:break-on-boundaries"
            );
        }

        // Look for label macros and attach their content as an argument to their parent environment.
        attachAdditionalAttributes(tree);

        // Look for vertical-spacing commands (\vspace, \vfil(l), \vskip) that trail the
        // content of some environment/macro argument, and convert them into a `workspace`
        // attribute on the container they trail (see vertical-space-subs.ts). Must run
        // before division macros are wrapped in `<p>` tags and before environment/macro
        // replacement, since it records the attribute via `_renderInfo` on the raw node.
        attachVerticalSpaceWorkspace(tree);

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
                const replacement = environmentReplacements[printRaw(node.env)](
                    node,
                    info,
                    file
                );
                const withAttributes = applyRenderInfoAttributes(
                    node,
                    replacement
                );
                markAsBlockLevel(withAttributes);
                return withAttributes;
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
                return applyRenderInfoAttributes(node, replacement);
            }
        });

        // before replacing math-mode macros, report any macros that can't be replaced
        const unsupportedByMathjax = reportMacrosUnsupportedByMathjax(tree);

        // add these warning messages into the file one at a time
        for (const warningMessage of unsupportedByMathjax.messages) {
            file.message(
                warningMessage,
                warningMessage.place,
                "unified-latex-to-pretext:report-unsupported-macro-mathjax"
            );
        }

        // Replace math-mode macros for appropriate MathJax rendering
        attachNeededRenderInfo(tree);
        replaceNode(tree, (node) => {
            if (isMathjaxMacro(node)) {
                return mathjaxSpecificMacroReplacements[node.content](node);
            }
            if (isMathjaxEnvironment(node)) {
                return mathjaxSpecificEnvironmentReplacements[
                    printRaw(node.env)
                ](node);
            }
        });

        // Pars are split into `<p>` tags early (before macro/environment
        // replacement runs) so that par-breaking macros like `\section` can
        // still be recognized as themselves. A macro/environment with no
        // PreTeXt equivalent (see dropped-subs.ts) is only replaced with an
        // empty string *after* that split, so a paragraph whose sole content
        // was one of those dropped macros (e.g. a lone `\centering` on its
        // own line) is left wrapping nothing — a self-closing `<p/>`. Final
        // pass: unwrap any `<p>` that has no meaningful content left.
        removeEmptyPars(tree);

        // Wrap in enough tags to ensure a valid pretext document
        if (!producePretextFragment) {
            // choose a book or article tag
            createValidPretextDoc(tree, options?.frontmatter);

            // wrap around with pretext tag
            tree.content = [
                htmlLike({ tag: "pretext", content: tree.content }),
            ];
        }

        // Make sure we are actually mutating the current tree.
        originalTree.content = tree.content;
    };
};

/**
 * Unwrap any `<p>` html-like tag whose content has nothing meaningful left
 * in it (see the call site for why this can happen after macro/environment
 * replacement runs). The tag is dropped but its (empty/whitespace/comment)
 * content is kept in place, so a lone comment isn't lost.
 */
function removeEmptyPars(tree: Ast.Root): void {
    replaceNode(tree, (node) => {
        if (!isHtmlLikeTag(node)) {
            return;
        }
        const { tag, content } = extractFromHtmlLike(node);
        if (tag === "p" && !hasMeaningfulContent(content)) {
            return content;
        }
    });
}

/**
 * Whether `nodes` contains anything that should actually render as content,
 * as opposed to only whitespace/comments/parbreaks or empty strings/groups
 * left behind by a dropped macro (see `dropped-subs.ts`).
 */
function hasMeaningfulContent(nodes: Ast.Node[]): boolean {
    return nodes.some((node) => {
        if (match.comment(node) || match.whitespace(node) || match.parbreak(node)) {
            return false;
        }
        if (node.type === "string") {
            return node.content.trim() !== "";
        }
        if (node.type === "group") {
            return hasMeaningfulContent(node.content);
        }
        return true;
    });
}

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
        // Recurse into divisions and slides, whose content is wrapped by the
        // pre-pass, so a parbreak nested inside one still triggers wrapping.
        if (isMappedEnviron(node) || isSlideEnviron(node)) {
            return containsPar(node.content);
        }

        return match.parbreak(node) || match.macro(node, "par");
    });
}

/**
 * Wrap the tree content in a book or article tag. `frontmatter`, when given,
 * is inserted right after `<title>` (see `bibinfo.ts`).
 */
function createValidPretextDoc(tree: Ast.Root, frontmatter?: Ast.Macro | null): void {
    // A document may start with \book{Title}, \article{Title}, or
    // \slideshow{Title} instead of relying on \documentclass and \title.
    // breakOnBoundaries treats these as the outermost division, so by now
    // the whole document is already wrapped in a single `_book`, `_article`,
    // or `_slideshow` environment carrying its title as an argument — that
    // environment *is* the document root, so skip the heuristics below.
    const rootDivision = tree.content.find(
        (node) => anyEnvironment(node) && isTopLevelDocEnviron(node)
    ) as Ast.Environment | undefined;
    if (rootDivision) {
        // The division's title is synthesized from its argument later, in
        // `to-pretext.ts`'s environment conversion (`[titleTag, ...content]`),
        // so putting `frontmatter` first in its content puts it right after
        // that synthesized title in the final output.
        if (frontmatter) {
            rootDivision.content.unshift(frontmatter);
        }
        tree.content = [rootDivision];
        return;
    }

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

        // get the actual title.
        if (titleArg) {
            tree.content.unshift(htmlLike({ tag: "title", content: titleArg }));
            //now remove the title macro since we don't want it in the content
            replaceNode(tree, (node) => {
                if (node === title) {
                    return [];
                }
            });
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

    // <title> was just unshifted to index 0 above (every branch does it);
    // <frontmatter> goes right after it.
    if (frontmatter) {
        tree.content.splice(1, 0, frontmatter);
    }

    // now create a book or article tag
    if (isBook) {
        tree.content = [htmlLike({ tag: "book", content: tree.content })];
    } else {
        tree.content = [htmlLike({ tag: "article", content: tree.content })];
    }
}

/**
 * Delete comments that appear inside math mode. Math content is rendered raw,
 * so a comment would end up as a literal `%...` in the output.
 */
function deleteCommentsInMathMode(tree: Ast.Root): void {
    replaceNode(tree, (node, info) => {
        if (
            match.comment(node) &&
            (info.context.inMathMode || info.context.hasMathModeAncestor)
        ) {
            return null;
        }
    });
}

/**
 * Look for nearby macros such as \label and attach their content as an additional attribute to the parent's renderInfo.
 *
 * @param tree
 */
function attachAdditionalAttributes(tree: Ast.Root): void {
    replaceNode(tree, (node, info) => {
        // A `\label` inside display math belongs to a single *row* of that
        // display, which `info.parents[0]` cannot express -- it is the whole
        // math environment. `displayMathToXast` knows the row structure, so it
        // owns math labels; leave them in place for it to find.
        if (info.context.hasMathModeAncestor) {
            return;
        }
        if (match.macro(node, "label")) {
            const args = getArgsContent(node);
            const labelContent = args[args.length - 1];
            if (labelContent) {
                // attach the label content as an argument to the parent environment
                const renderInfo = info.parents[0]?._renderInfo ?? {};
                if (renderInfo) {
                    renderInfo.additionalAttributes =
                        renderInfo.additionalAttributes ?? {};
                    renderInfo.additionalAttributes["xml:id"] = sanitizeXmlId(
                        printRaw(labelContent)
                    );
                    info.parents[0]._renderInfo = renderInfo;
                }
            }

            // remove the label macro since we don't want it in the content anymore
            return null;
        }
    });
}

/**
 * Tag every html-like node produced by an environment replacement as
 * block-level, by setting `_renderInfo.isBlockLevel`.
 *
 * Environment replacement runs bottom-up (children replaced before their
 * parent, see `replaceNode`), so by the time an *outer* environment's own
 * replacement factory wraps its content in `<p>` tags (e.g. `envFactory`'s
 * `wrapContentInPars`, or a dropped environment via `dropped-subs.ts`), any
 * nested environment has already been converted into a plain html-like
 * macro — indistinguishable, to `splitForPars`, from an inline macro like
 * `<em>`. Without this marker, a `\begin{theorem}...\end{theorem}` nested
 * inside a `\begin{minipage}` would get wrapped inside a `<p>`, which is
 * invalid. `splitForPars` treats a marked node as a paragraph boundary, the
 * same way it already treats a still-unconverted `environment` node.
 */
function markAsBlockLevel(
    replacement: Ast.Node | Ast.Node[] | null | undefined | void
): void {
    const nodes = replacement == null
        ? []
        : Array.isArray(replacement)
          ? replacement
          : [replacement];
    for (const n of nodes) {
        if (isHtmlLikeTag(n)) {
            n._renderInfo = { ...n._renderInfo, isBlockLevel: true };
        }
    }
}

/**
 * If `node` (the environment/macro that was just replaced) carries attributes
 * recorded via `_renderInfo.additionalAttributes` — e.g. `xml:id` from a
 * `\label`, or `workspace` from a trailing `\vspace` (see `attachAdditionalAttributes`
 * and `attachVerticalSpaceWorkspace`) — merge them onto whichever html-like tag it
 * was replaced with. Individual replacement factories are free to handle
 * `_renderInfo` themselves (some already do, for tags built up from several pieces),
 * but this makes it work automatically for every replacement, not just the ones
 * that remembered to check.
 */
function applyRenderInfoAttributes<T extends Ast.Node | Ast.Node[] | null | undefined | void>(
    node: Ast.Node,
    replacement: T
): T {
    const additionalAttributes = node._renderInfo?.additionalAttributes;
    if (!additionalAttributes || replacement == null) {
        return replacement;
    }

    const mergeInto = (candidate: Ast.Node): Ast.Node => {
        if (!isHtmlLikeTag(candidate)) {
            return candidate;
        }
        const { tag, attributes, content } = extractFromHtmlLike(candidate);
        return htmlLike({
            tag,
            content,
            attributes: { ...additionalAttributes, ...attributes },
        });
    };

    if (Array.isArray(replacement)) {
        let merged = false;
        return replacement.map((n) => {
            if (!merged && isHtmlLikeTag(n)) {
                merged = true;
                return mergeInto(n);
            }
            return n;
        }) as T;
    }

    return mergeInto(replacement as Ast.Node) as T;
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
