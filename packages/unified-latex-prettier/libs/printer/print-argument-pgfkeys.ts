import { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    hardline,
    join,
    breakParent,
    line,
    group,
    indent,
    softline,
} from "./common";
import {
    linebreak,
    printRaw,
} from "@unified-latex/unified-latex-util-print-raw";
import { parsePgfkeys } from "@unified-latex/unified-latex-util-pgfkeys";

/**
 * Format a sequence of Pgfkeys key-value pairs. `nodes` will be parsed
 * by a grammar defining Pgfkeys
 *
 * @param {Ast.Node[]} nodes
 * @param {{ openMark: string; closeMark: string; leadingComment: Ast.Comment | null }} options - A `leadingComment` is a comment that appears as the first item in the environment (e.g. `\pgfkeys{%comment\na,b,c}`); If `allowParenGroups` is set to true, commas inside parenthesis won't be parsed as separators. Default behavior is `allowParenGroups === false`.
 * @returns {Doc}
 */
export function printArgumentPgfkeys(
    nodes: Ast.Node[],
    options: {
        openMark: string;
        closeMark: string;
        leadingComment?: Ast.Comment | null | undefined;
        allowParenGroups?: boolean;
    }
): Doc {
    const { allowParenGroups = false } = options;
    const parsed = parsePgfkeys(nodes, { allowParenGroups });

    const content: Doc[] = [];
    for (const part of parsed) {
        const isLastItem = part === parsed[parsed.length - 1];

        if (part.itemParts) {
            // parts are printed using `printRaw`, `hardline` is used in place
            // of "\n"
            const parts = part.itemParts.map((node) =>
                printRaw(node, { asArray: true }).map((token) =>
                    token === linebreak ? hardline : token
                )
            );
            const row = join("=", parts);
            content.push(row);
            if (part.trailingComma) {
                content.push(",");
            }
        }
        if (part.trailingComment) {
            const leadingContent: Doc[] = part.itemParts ? [" "] : [];
            if (part.leadingParbreak) {
                // We preserve parbreaks before comments, so if we have
                // one, insert an extra hardline
                leadingContent.push(hardline);
            }

            content.push(
                ...leadingContent,
                // We're carefully and manually controlling the newlines,
                // so print the comment directly without any newlines
                "%",
                part.trailingComment.content,
                breakParent
            );
        }

        if (!isLastItem) {
            content.push(line);
        }
    }

    let leadingComment: Doc[] = [""];
    if (options.leadingComment) {
        if (options.leadingComment.leadingWhitespace) {
            leadingComment.push(" ");
        }
        leadingComment.push("%" + options.leadingComment.content, breakParent);
    }

    return group([
        options.openMark,
        ...leadingComment,
        // If there is no content, we don't want to push an extra `softline`.
        // This matters because the braces group could still be broken by `leadingComment`
        content.length > 0 ? indent([softline, ...content]) : "",
        softline,
        options.closeMark,
    ]);
}
