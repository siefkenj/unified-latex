import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * Scan `nodes` looking for the first occurrence of `token`.
 * If `options.onlySkipWhitespaceAndComments==true`, then the scan
 * will only skip whitespace/comment nodes.
 */
export function scan(
    nodes: (Ast.Node | Ast.Argument)[],
    token: string | Ast.Node | Ast.Argument,
    options?: {
        /**
         * Index to start scanning.
         */
        startIndex?: number;
        /**
         * Index to end scanning.
         */
        endIndex?: number;
        /**
         * If `true`, whitespace and comments will be skipped but any other
         * node that doesn't match `token` will cause the scan to terminate.
         */
        onlySkipWhitespaceAndComments?: boolean;
        /**
         * If `true`, will look inside `Ast.String` nodes to see if the string contents
         * contain `token`.
         */
        allowSubstringMatches?: boolean;
    }
): number | null {
    const {
        startIndex = 0,
        endIndex = nodes.length - 1,
        onlySkipWhitespaceAndComments,
        allowSubstringMatches,
    } = options || {};
    if (typeof token === "string") {
        token = { type: "string", content: token } as Ast.String;
    }

    for (let i = startIndex; i <= endIndex; i++) {
        const node = nodes[i];
        if (node.type === token.type) {
            switch (node.type) {
                case "comment":
                case "displaymath":
                case "inlinemath":
                case "root":
                case "parbreak":
                case "whitespace":
                case "verb":
                case "verbatim":
                case "group":
                    return i;
                case "macro":
                    if (node.content === (token as Ast.Macro).content) {
                        return i;
                    }
                    break;
                case "environment":
                case "mathenv":
                    if (
                        printRaw(node.env) ===
                        printRaw((token as Ast.Environment).env)
                    ) {
                        return i;
                    }
                    break;
                case "string":
                    if (node.content === (token as Ast.String).content) {
                        return i;
                    }
                    if (
                        allowSubstringMatches &&
                        node.content.indexOf((token as Ast.String).content) >= 0
                    ) {
                        return i;
                    }
                    break;
            }
        }
        if (
            onlySkipWhitespaceAndComments &&
            !match.whitespace(node) &&
            !match.comment(node)
        ) {
            return null;
        }
    }

    return null;
}
