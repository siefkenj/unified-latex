import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import {
    decorateArrayForPegjs,
    LigaturesPegParser,
} from "../../unified-latex-util-pegjs";
import { ligatureToUnicode } from "./ligature-lookup";

export function createMatchers() {
    return {
        isMacro: match.anyMacro,
        isWhitespace: match.whitespace,
        isRecognized: (nodes: Ast.Node[], whitespaceAllowed = false) => {
            // If the first argument is a macro, the second token may be wrapped in a group.
            // In this case we want to unwrap the group
            const nodesToTest = [...nodes];
            if (nodes.length === 2 && match.macro(nodes[0])) {
                const arg = nodes[1];
                if (match.group(arg) && arg.content.length === 1) {
                    nodesToTest[1] = arg.content[0];
                }
            }
            return ligatureToUnicode(nodesToTest);
        },
        isSplitable: (node: Ast.Node) =>
            match.anyString(node) && node.content.length > 1,
        split: (node: Ast.String) => [
            { type: "string", content: node.content.charAt(0) },
            { type: "string", content: node.content.slice(1) },
        ],
    };
}

/**
 * Parse for recognized ligatures like `---` and `\:o`, etc. These are
 * replaced with string nodes with the appropriate unicode character subbed in.
 */
export function parseLigatures(ast: Ast.Node[]): Ast.Node[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return LigaturesPegParser.parse(ast, createMatchers());
}
