import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { VFileMessage } from "vfile-message";

export type AuthorInfo = Record<string, Ast.Node[]>;

/**
 *
 * Visits all the matching nodes and gathers author information, then send them to render and output pretext.
 */
export function gatherAuthorInfo(ast: Ast.Ast): AuthorInfo[] | VFileMessage {
    const authorList: AuthorInfo[] = [];

    visit(ast, (node) => {
        if (match.macro(node, "author") && node.args) {
            const authorName = Object.fromEntries(
                node.args.map((x) => ["personname", x.content])
            );
            authorList.push(authorName);
        } else if (match.macro(node, "address") && node.args) {
            const authorAdd = Object.fromEntries(
                node.args.map((x) => ["address", x.content])
            );
            authorList.push(authorAdd);
        } else if (match.macro(node, "email") && node.args) {
            const authorEmail = Object.fromEntries(
                node.args.map((x) => ["email", x.content])
            );
            authorList.push(authorEmail);
        } else if (match.macro(node, "affil")) {
            MacroReport(node);
            throw new Error('Macro "${node.content}" is not supported');
        }
    });
    return authorList;
}

/**
 * This function is called after the author information is collected, and integrate them into one htmlLike node with "author" tag.
 */
export function renderCollectedAuthorInfo(authorList: AuthorInfo[]): Ast.Macro {
    let authorInfo: Ast.Macro[] = [];
    for (const info of authorList) {
        for (const key in info) {
            const renderInfo = htmlLike({
                tag: key,
                content: info[key],
            });
            authorInfo.push(renderInfo);
        }
    }
    const renderedAuthorList = htmlLike({
        tag: "author",
        content: authorInfo,
    });
    return renderedAuthorList;
}

function MacroReport(node: Ast.Macro): VFileMessage {
    const message = new VFileMessage(
        `Macro \"${node.content}\" is not supported`
    );

    // add the position of the macro if available
    if (node.position) {
        message.line = node.position.start.line;
        message.column = node.position.start.column;
        message.position = {
            start: {
                line: node.position.start.line,
                column: node.position.start.column,
            },
            end: {
                line: node.position.end.line,
                column: node.position.end.column,
            },
        };
    }

    message.source = "unified-latex-to-pretext:warning";
    return message;
}
