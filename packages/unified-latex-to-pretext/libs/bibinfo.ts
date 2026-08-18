import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { s } from "@unified-latex/unified-latex-builder";
import { VFile } from "vfile";
import { gatherAuthorInfo, renderCollectedAuthorInfo } from "./author-info";

/** Macros gathered into `<frontmatter>` and stripped from the document body. */
const BIBINFO_MACROS = ["author", "address", "email", "date", "keywords", "subjclass"];

/** The last (mandatory) argument's content; all of these macros have signature `o m`. */
function lastArgContent(macro: Ast.Macro): Ast.Node[] {
    const args = getArgsContent(macro);
    return args[args.length - 1] || [];
}

/**
 * `\keywords`/`\subjclass` list their entries comma-separated in a single
 * argument (the AMS convention); PreTeXt wants each as its own `<keyword>`.
 * This only handles plain-text entries -- markup inside a keyword would be
 * flattened by `printRaw`, but keyword lists are essentially always plain text.
 */
function splitKeywords(content: Ast.Node[]): Ast.Macro[] {
    return printRaw(content)
        .split(",")
        .map((piece) => piece.trim())
        .filter((piece) => piece.length > 0)
        .map((piece) => htmlLike({ tag: "keyword", content: [s(piece)] }));
}

/**
 * Gather `\author`/`\address`/`\email`/`\date`/`\keywords`/`\subjclass` from
 * anywhere in the tree (preamble or body), remove them so they don't leak
 * into the converted content, and return a
 * `<frontmatter><bibinfo>...</bibinfo><titlepage><titlepage-items/></titlepage></frontmatter>`
 * node -- matching the PreTeXt schema, where `<titlepage>` is a required but
 * always-empty stub -- ready to be inserted right after `<title>`. Returns
 * `null` when nothing was found, since `<frontmatter>` is itself optional.
 *
 * Note: `\thanks` (funding/acknowledgement footnotes) has no corresponding
 * `<bibinfo>` field in the PreTeXt schema, so it isn't handled here.
 */
export function gatherAndRemoveBibinfo(
    tree: Ast.Root,
    file: VFile
): Ast.Macro | null {
    const authors = gatherAuthorInfo(tree, file);

    let date: Ast.Node[] | undefined;
    const keywordEntries: Ast.Macro[] = [];
    const subjclassBlocks: Ast.Macro[] = [];

    visit(tree, (node) => {
        if (match.macro(node, "date") && node.args) {
            date = lastArgContent(node);
        } else if (match.macro(node, "keywords") && node.args) {
            keywordEntries.push(...splitKeywords(lastArgContent(node)));
        } else if (match.macro(node, "subjclass") && node.args) {
            const args = getArgsContent(node);
            const variant = args[0]?.length ? printRaw(args[0]) : undefined;
            const entries = splitKeywords(args[args.length - 1] || []);
            if (entries.length > 0) {
                subjclassBlocks.push(
                    htmlLike({
                        tag: "keywords",
                        content: entries,
                        attributes: {
                            authority: "msc",
                            ...(variant ? { variant } : {}),
                        },
                    })
                );
            }
        }
    });

    const isBibinfoMacro = match.createMacroMatcher(BIBINFO_MACROS);
    replaceNode(tree, (node) => (isBibinfoMacro(node) ? null : undefined));

    const authorTags = renderCollectedAuthorInfo(authors);
    if (authorTags.length === 0 && !date && keywordEntries.length === 0 && subjclassBlocks.length === 0) {
        return null;
    }

    const bibinfoContent: Ast.Macro[] = [...authorTags];
    if (date) {
        bibinfoContent.push(htmlLike({ tag: "date", content: date }));
    }
    if (keywordEntries.length > 0) {
        bibinfoContent.push(htmlLike({ tag: "keywords", content: keywordEntries }));
    }
    bibinfoContent.push(...subjclassBlocks);

    return htmlLike({
        tag: "frontmatter",
        content: [
            htmlLike({ tag: "bibinfo", content: bibinfoContent }),
            htmlLike({
                tag: "titlepage",
                content: [htmlLike({ tag: "titlepage-items", content: [] })],
            }),
        ],
    });
}
