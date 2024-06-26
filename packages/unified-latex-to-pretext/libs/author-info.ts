import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 *
 * Visits all the matching nodes and gathers author information, then send them to render and output pretext.
 */
export function gatherAuthorInfo(ast: Ast.Ast): string[] {
    const authorList: any[] = [];

    visit(ast, (node) => {
        if (match.macro(node, "author") && node.args) {
            const authorName = Object.fromEntries(
                node.args.map((x) => ["personname", printRaw(x.content)])
            );
            renderAuthorName(node);
            authorList.push(authorName);
        } else if (match.macro(node, "address") && node.args) {
            const authorAdd = Object.fromEntries(
                node.args.map((x) => ["address", printRaw(x.content)])
            );
            authorList.push(authorAdd);
        } else if (match.macro(node, "email") && node.args) {
            const authorEmail = Object.fromEntries(
                node.args.map((x) => ["email", printRaw(x.content)])
            );
            authorList.push(authorEmail);
        }
    });
    const authorListNode = htmlLike({
        tag: "author",
        content: renderCollectedAuthorInfo(authorList),
    });

    return authorList;
}

/**
 * This function is called when finished collecting the author name, and it renders the info and returns a htmlLike node.
 */

export function renderAuthorName(authorInfo: Ast.Macro): Ast.Macro {
    const renderedAuthorName = htmlLike({
        tag: "personname",
        content: authorInfo,
    });
    return renderedAuthorName;
}

/**
 * This function is called after the author information is collected, and integrate them into one htmlLike node with "author" tag.
 */
export function renderCollectedAuthorInfo(authorList: any[]): Ast.Macro[] {
    const renderedAuthorList = [];
    for (const [key, value] of Object.entries(authorList)) {
        const renderedAuthor = htmlLike({
            tag: key,
            content: value,
        });
        renderedAuthorList.push(renderedAuthor);
    }
    return renderedAuthorList;
}
