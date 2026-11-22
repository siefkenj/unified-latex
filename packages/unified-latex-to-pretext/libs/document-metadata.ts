import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Document-level information the root element (`<article>`, `<book>`,
 * `<slideshow>`) is built from, most of which lives in the preamble.
 */
export type DocumentMetadata = {
    /** The `\documentclass` argument, e.g. `beamer`. */
    documentClass?: string;
    /** The long form of a preamble `\title[short]{long}`. */
    title?: Ast.Node[];
    shortTitle?: Ast.Node[];
    /** `\subtitle[short]{long}` (beamer, KOMA-Script). */
    subtitle?: Ast.Node[];
    /** Beamer's `\titlegraphic{...}`, drawn on the title page. */
    titlegraphic?: Ast.Node[];
};

/**
 * Gather `DocumentMetadata` from the tree before the conversion narrows it to
 * the `document` environment, which would otherwise drop the preamble --
 * and with it the `\documentclass` and the `\title` the root is made from.
 *
 * `\documentclass` and `\title` are read from the preamble only, leaving a
 * `\title` inside the document to the body-level fallback in
 * `createValidPretextDoc`. `\subtitle` and `\titlegraphic` have no meaning in
 * the body, so they are read, and removed, wherever they are.
 */
export function gatherDocumentMetadata(tree: Ast.Root): DocumentMetadata {
    const metadata: DocumentMetadata = {};

    const documentIndex = tree.content.findIndex((node) =>
        match.environment(node, "document")
    );
    const preamble =
        documentIndex === -1 ? [] : tree.content.slice(0, documentIndex);
    for (const node of preamble) {
        if (match.macro(node, "documentclass") && node.args) {
            metadata.documentClass = printRaw(lastArg(node) ?? []).trim();
        } else if (match.macro(node, "title") && node.args) {
            const args = getArgsContent(node);
            metadata.title = lastArg(node) ?? [];
            if (args.length > 1 && args[0]) {
                metadata.shortTitle = args[0];
            }
        }
    }

    visit(tree, (node) => {
        if (match.macro(node, "subtitle") && node.args) {
            metadata.subtitle = lastArg(node) ?? [];
        } else if (match.macro(node, "titlegraphic") && node.args) {
            metadata.titlegraphic = lastArg(node) ?? [];
        }
    });
    replaceNode(tree, (node) =>
        match.macro(node, "subtitle") || match.macro(node, "titlegraphic")
            ? null
            : undefined
    );

    return metadata;
}

function lastArg(macro: Ast.Macro): Ast.Node[] | null {
    const args = getArgsContent(macro);
    return args[args.length - 1] ?? null;
}
